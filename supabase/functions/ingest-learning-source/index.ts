import { createClient } from 'npm:@supabase/supabase-js@2'
import { chunkSourceText, normalizeSourceText } from '../_shared/ragUtils.mjs'

const corsHeaders = { 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small'
const MAX_CONTENT_CHARS = 120_000
const MAX_CHUNKS = 100
const OWNER_OVERRIDE_EMAILS = new Set(['mbrock19@gmail.com'])

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
async function embed(inputs: string[]) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST', signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${openAiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embeddingModel, input: inputs, dimensions: 1536 }),
  })
  const payload = await response.json()
  if (!response.ok || !Array.isArray(payload?.data)) throw new Error(payload?.error?.message ?? 'Embedding generation failed')
  const embeddings = [...payload.data].sort((a, b) => a.index - b.index).map(item => item.embedding)
  if (embeddings.length !== inputs.length || embeddings.some(value => !Array.isArray(value) || value.length !== 1536 ||
    value.some(component => typeof component !== 'number' || !Number.isFinite(component)))) {
    throw new Error('Embedding provider returned an invalid vector batch')
  }
  return embeddings
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !openAiApiKey) return jsonResponse({ error: 'Source ingestion is not configured.' }, 500)
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Unable to validate the current user.' }, 401)
  const { data: settings, error: settingsError } = await userClient.from('user_ai_settings').select('plan_tier').eq('user_id', user.id).maybeSingle()
  if (settingsError) return jsonResponse({ error: 'Unable to validate source access.' }, 503)
  const ownerOverride = Boolean(user.email && OWNER_OVERRIDE_EMAILS.has(user.email.toLowerCase()))
  if (!ownerOverride && settings?.plan_tier !== 'premium') return jsonResponse({ error: 'Grounded learning requires the Premium plan.' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400) }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = normalizeSourceText(typeof body.content === 'string' ? body.content : '')
  const sourceType = typeof body.sourceType === 'string' ? body.sourceType : 'text'
  const sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null
  if (!title || title.length > 200 || !['text', 'notes', 'url', 'document'].includes(sourceType)) {
    return jsonResponse({ error: 'Provide a title of 1–200 characters and a supported source type.' }, 400)
  }
  if (!content || content.length > MAX_CONTENT_CHARS) return jsonResponse({ error: `Source content must be 1–${MAX_CONTENT_CHARS} characters.` }, 400)
  if (sourceUrl) {
    try { const parsed = new URL(sourceUrl); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error() }
    catch { return jsonResponse({ error: 'Source URL must use HTTP or HTTPS.' }, 400) }
  }
  const chunks = chunkSourceText(content)
  if (!chunks.length || chunks.length > MAX_CHUNKS) return jsonResponse({ error: `Source must produce 1–${MAX_CHUNKS} chunks.` }, 400)
  const contentHash = await sha256(content)
  const existing = await serviceClient.from('learning_sources').select('id,title,source_type,source_url,chunk_count,embedding_model,status,created_at')
    .eq('user_id', user.id).eq('content_hash', contentHash).maybeSingle()
  if (existing.error) return jsonResponse({ error: 'Unable to check existing sources.' }, 503)
  if (existing.data?.status === 'ready') return jsonResponse({ source: existing.data, reused: true })

  const sourceId = existing.data?.id ?? crypto.randomUUID()
  if (!existing.data) {
    const inserted = await serviceClient.from('learning_sources').insert({ id: sourceId, user_id: user.id,
      title, source_type: sourceType, source_url: sourceUrl, content_hash: contentHash,
      status: 'processing', embedding_model: embeddingModel })
    if (inserted.error) {
      const raced = await serviceClient.from('learning_sources').select('*').eq('user_id', user.id).eq('content_hash', contentHash).maybeSingle()
      if (raced.data?.status === 'ready') return jsonResponse({ source: raced.data, reused: true })
      return jsonResponse({ error: 'Unable to create learning source.' }, 500)
    }
  } else {
    await serviceClient.from('learning_source_chunks').delete().eq('source_id', sourceId).eq('user_id', user.id)
    await serviceClient.from('learning_sources').update({ status: 'processing', failure_reason: null, chunk_count: 0,
      embedding_model: embeddingModel, updated_at: new Date().toISOString() }).eq('id', sourceId).eq('user_id', user.id)
  }
  try {
    let insertedCount = 0
    for (let offset = 0; offset < chunks.length; offset += 20) {
      const batch = chunks.slice(offset, offset + 20)
      const embeddings = await embed(batch)
      const rows = batch.map((chunk, index) => ({ source_id: sourceId, user_id: user.id,
        chunk_index: offset + index, content: chunk, token_estimate: Math.max(1, Math.ceil(chunk.length / 4)),
        embedding: embeddings[index] }))
      const inserted = await serviceClient.from('learning_source_chunks').insert(rows)
      if (inserted.error) throw inserted.error
      insertedCount += rows.length
    }
    const updated = await serviceClient.from('learning_sources').update({ status: 'ready', chunk_count: insertedCount,
      updated_at: new Date().toISOString() }).eq('id', sourceId).eq('user_id', user.id)
      .select('id,title,source_type,source_url,chunk_count,embedding_model,status,created_at').single()
    if (updated.error) throw updated.error
    return jsonResponse({ source: updated.data, reused: false })
  } catch (error) {
    await serviceClient.from('learning_sources').update({ status: 'failed',
      failure_reason: error instanceof Error ? error.message.slice(0, 1000) : 'Source ingestion failed',
      updated_at: new Date().toISOString() }).eq('id', sourceId).eq('user_id', user.id)
    return jsonResponse({ error: 'Unable to index this source right now.' }, 500)
  }
})
