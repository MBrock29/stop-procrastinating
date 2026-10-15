import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractResponseText, normalizeQuestion } from '../_shared/cardGeneration.mjs'
import { lexicalGroundingScore, validateCitationIndexes } from '../_shared/ragUtils.mjs'
import { resolveGenerationRequest } from '../_shared/generationRequest.ts'

const corsHeaders = { 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-generation-worker-secret, x-generation-user-id' }
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const generationModel = Deno.env.get('GROUNDED_CARD_MODEL') ?? 'gpt-5-mini'
const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small'
const PROMPT_VERSION = 'grounded-cards-v1'
const RETRIEVAL_COUNT = 8
const OWNER_OVERRIDE_EMAILS = new Set(['mbrock19@gmail.com'])

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
async function embed(value: string) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${openAiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embeddingModel, input: value, dimensions: 1536 }),
  })
  const payload = await response.json()
  const embedding = payload?.data?.[0]?.embedding
  if (!response.ok || !Array.isArray(embedding) || embedding.length !== 1536 ||
    embedding.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error(payload?.error?.message ?? 'Query embedding failed')
  }
  return embedding
}
function schema(cardCount: number, maximumCitation: number) {
  return { type: 'object', additionalProperties: false, properties: { cards: { type: 'array',
    minItems: cardCount, maxItems: cardCount, items: { type: 'object', additionalProperties: false,
      properties: { question: { type: 'string' }, answer: { type: 'string' }, citations: { type: 'array',
        minItems: 1, maxItems: 3, items: { type: 'integer', minimum: 1, maximum: maximumCitation } } },
      required: ['question', 'answer', 'citations'] } } }, required: ['cards'] }
}
function parseCards(raw: string, count: number, retrieved: number) {
  let payload
  try { payload = JSON.parse(raw) } catch { throw new Error('Grounded model returned invalid JSON') }
  if (!payload || !Array.isArray(payload.cards) || payload.cards.length !== count) throw new Error('Grounded model returned the wrong card count')
  return payload.cards.map((card: unknown) => {
    const item = card as Record<string, unknown>
    if (!item || typeof item.question !== 'string' || !item.question.trim() ||
      typeof item.answer !== 'string' || !item.answer.trim() ||
      Object.keys(item).some(key => !['question', 'answer', 'citations'].includes(key))) {
      throw new Error('Grounded model returned an invalid card')
    }
    return { question: item.question.trim(), answer: item.answer.trim(),
      citations: validateCitationIndexes(item.citations, retrieved) }
  })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !openAiApiKey) return jsonResponse({ error: 'Grounded generation is not configured.' }, 500)
  const identity = await resolveGenerationRequest(request)
  if ('error' in identity) return jsonResponse({ error: identity.error }, identity.status)
  const { client: userClient, user, internal } = identity
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: settings, error: settingsError } = await userClient.from('user_ai_settings').select('plan_tier').eq('user_id', user.id).maybeSingle()
  if (settingsError) return jsonResponse({ error: 'Unable to validate grounded-generation access.' }, 503)
  const ownerOverride = Boolean(user.email && OWNER_OVERRIDE_EMAILS.has(user.email.toLowerCase()))
  if (!ownerOverride && settings?.plan_tier !== 'premium') return jsonResponse({ error: 'Grounded generation requires the Premium plan.' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400) }
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : ''
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  const cardCount = body.cardCount ?? 8
  const generationBatchId = typeof body.generationBatchId === 'string' ? body.generationBatchId.trim() : ''
  if (!sourceId || !topic || topic.length > 500 || typeof cardCount !== 'number' ||
    !Number.isSafeInteger(cardCount) || cardCount < 1 || cardCount > 20 ||
    (generationBatchId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(generationBatchId))) {
    return jsonResponse({ error: 'Provide a source, a topic of 1–500 characters and an integer card count of 1–20.' }, 400)
  }
  const requestId = crypto.randomUUID(); const startedAt = performance.now()
  let source: { id: string; title: string; source_url: string | null; status: string } | null = null
  let retrievedIds: string[] = []; let similarities: number[] = []
  try {
    const sourceResult = await userClient.from('learning_sources').select('id,title,source_url,status')
      .eq('id', sourceId).eq('user_id', user.id).maybeSingle()
    if (sourceResult.error) throw sourceResult.error
    source = sourceResult.data
    if (!source) return jsonResponse({ error: 'Source not found.' }, 404)
    if (source.status !== 'ready') return jsonResponse({ error: 'Source is not ready for retrieval.' }, 409)
    const queryEmbedding = await embed(topic)
    const matches = internal
      ? await userClient.rpc('match_learning_source_chunks_for_service', { p_user_id: user.id,
          p_query_embedding: queryEmbedding, p_match_count: RETRIEVAL_COUNT, p_source_id: sourceId })
      : await userClient.rpc('match_learning_source_chunks', { p_query_embedding: queryEmbedding,
          p_match_count: RETRIEVAL_COUNT, p_source_id: sourceId })
    if (matches.error) throw matches.error
    const chunks = (matches.data ?? []) as Array<{ id: string; source_id: string; chunk_index: number; content: string; similarity: number }>
    if (!chunks.length) throw new Error('No source chunks were retrieved')
    retrievedIds = chunks.map(chunk => chunk.id); similarities = chunks.map(chunk => Number(chunk.similarity))
    const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n\n')
    const existingResult = await userClient.from('learning_cards').select('question').eq('user_id', user.id)
      .eq('generation_topic', topic).order('created_at', { ascending: false }).limit(80)
    if (existingResult.error) throw existingResult.error
    const existing = new Set((existingResult.data ?? []).map(item => normalizeQuestion(item.question)))
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${openAiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: generationModel, max_output_tokens: Math.max(800, cardCount * 180),
        input: [{ role: 'system', content: [{ type: 'input_text', text: 'Create concise learning cards using only the numbered source excerpts. Every answer must be supported by and cite one to three excerpt numbers. If the excerpts do not support a claim, do not make it.' }] },
          { role: 'user', content: [{ type: 'input_text', text: `Topic: ${topic}\nCreate exactly ${cardCount} cards.\n\nSource excerpts:\n${context}` }] }],
        text: { format: { type: 'json_schema', name: 'grounded_learning_cards', strict: true,
          schema: schema(cardCount, chunks.length) } } }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message ?? 'Grounded model request failed')
    const cards = parseCards(extractResponseText(payload), cardCount, chunks.length)
    const seen = new Set(existing)
    for (const card of cards) {
      const identity = normalizeQuestion(card.question)
      if (!identity || seen.has(identity)) throw new Error('Grounded generation returned a duplicate question')
      seen.add(identity)
    }
    const hydrated = cards.map(card => {
      const cited = card.citations.map(index => chunks[index - 1])
      const groundingScore = lexicalGroundingScore(card.answer, cited.map(chunk => chunk.content))
      return { id: crypto.randomUUID(), question: card.question, answer: card.answer, sourceId,
        groundingScore, citations: cited.map(chunk => ({ chunkId: chunk.id, chunkIndex: chunk.chunk_index,
          excerpt: chunk.content.slice(0, 320), similarity: Number(chunk.similarity),
          sourceTitle: source!.title, sourceUrl: source!.source_url })) }
    })
    const passRate = Math.round(hydrated.filter(card => card.groundingScore >= 35).length / hydrated.length * 100)
    const persistedCards = hydrated.map(card => ({ id: card.id, question: card.question, answer: card.answer,
      citation_chunk_ids: card.citations.map(citation => citation.chunkId),
      citation_excerpts: card.citations.map(citation => citation.excerpt), grounding_score: card.groundingScore }))
    const persisted = await serviceClient.rpc('persist_grounded_generation', {
      p_event: { request_id: requestId, user_id: user.id, source_id: sourceId, topic,
        generation_batch_id: generationBatchId || null,
        model: generationModel, embedding_model: embeddingModel, prompt_version: PROMPT_VERSION,
        retrieved_chunk_ids: retrievedIds, retrieved_similarities: similarities,
        grounding_pass_rate: passRate, latency_ms: Math.round(performance.now() - startedAt),
        input_tokens: payload?.usage?.input_tokens ?? null, output_tokens: payload?.usage?.output_tokens ?? null,
        estimated_cost_usd: null }, p_cards: persistedCards })
    if (persisted.error) throw new Error(`Unable to persist grounded cards: ${persisted.error.message}`)
    const persistedIds = Array.isArray(persisted.data) ? persisted.data : []
    if (persistedIds.length !== hydrated.length) throw new Error('Persisted grounded card IDs are incomplete')
    const savedCards = hydrated.map((card, index) => ({ ...card, id: String(persistedIds[index]) }))
    return jsonResponse({ cards: savedCards, retrieval: { sourceId, sourceTitle: source.title,
      retrievedChunkCount: chunks.length, similarities }, meta: { requestId, model: generationModel,
      embeddingModel, promptVersion: PROMPT_VERSION, groundingPassRate: passRate,
      latencyMs: Math.round(performance.now() - startedAt), inputTokens: payload?.usage?.input_tokens ?? null,
      outputTokens: payload?.usage?.output_tokens ?? null, estimatedCostUsd: null } })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Grounded generation failed'
    await serviceClient.from('grounded_generation_events').insert({ request_id: requestId, user_id: user.id,
      source_id: source?.id ?? null, topic, model: generationModel, embedding_model: embeddingModel,
      prompt_version: PROMPT_VERSION, retrieved_chunk_ids: retrievedIds, retrieved_similarities: similarities,
      card_count: 0, latency_ms: Math.round(performance.now() - startedAt), status: 'failed', failure_reason: message })
    return jsonResponse({ error: 'Unable to generate grounded cards right now.', requestId }, 500)
  }
})
