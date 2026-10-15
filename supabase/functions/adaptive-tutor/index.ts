import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  compactToolResult,
  estimateTutorCost,
  extractTutorText,
  getToolCalls,
  MAX_TOOL_CALLS,
  MAX_TOOL_ROUNDS,
  parseToolArguments,
  parseTutorRecommendation,
  TUTOR_PROMPT_VERSION,
} from '../_shared/tutorRuntime.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
const tutorModel = Deno.env.get('AI_TUTOR_MODEL') ?? 'gpt-5-mini'
const OWNER_OVERRIDE_EMAILS = new Set(['mbrock19@gmail.com'])
const TUTOR_MONTHLY_LIMIT = 100
const TUTOR_COOLDOWN_MS = 30_000

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const recommendationSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    headline: { type: 'string' }, focusTopic: { type: 'string' }, reason: { type: 'string' },
    actions: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
    estimatedMinutes: { type: 'integer', minimum: 3, maximum: 20 },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['headline', 'focusTopic', 'reason', 'actions', 'estimatedMinutes', 'confidence'],
}

const tools = [
  ['get_topic_mastery', 'Return topics ordered from weakest reported confidence to strongest.', 20],
  ['get_due_cards', 'Return active cards that are due now or have never been reviewed.', 30],
  ['get_recent_weaknesses', 'Return recent semi-confident and not-confident reviews with their topics.', 20],
  ['get_recent_learning_briefs', 'Return recent learning brief metadata to avoid redundant study.', 10],
].map(([name, description, maximum]) => ({
  type: 'function', name, description, strict: true,
  parameters: { type: 'object', additionalProperties: false,
    properties: { limit: { type: 'integer', minimum: 1, maximum } }, required: ['limit'] },
}))

const instructions = `You are Better Focus's adaptive tutor. Inspect the learner's stored state through tools before recommending a short study session. Prefer weak and due topics. Never invent learner facts. When data is sparse, state that plainly and recommend a starter action. Keep the session practical and around ten minutes. Return only the required JSON recommendation.`

type ToolTrace = {
  name: string
  arguments: { limit: number }
  result: unknown | null
  status: 'success' | 'failed'
  latencyMs: number
  errorMessage: string | null
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !openAiApiKey) {
    return jsonResponse({ error: 'Tutor environment is not configured.' }, 500)
  }
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401)

  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return jsonResponse({ error: 'Unable to validate the current user.' }, 401)

  const { data: settings, error: settingsError } = await userClient.from('user_ai_settings')
    .select('plan_tier').eq('user_id', user.id).maybeSingle()
  if (settingsError) return jsonResponse({ error: 'Unable to validate tutor access.' }, 503)
  const ownerOverride = Boolean(user.email && OWNER_OVERRIDE_EMAILS.has(user.email.toLowerCase()))
  if (!ownerOverride && settings?.plan_tier !== 'premium') {
    return jsonResponse({ error: 'The adaptive tutor requires the Premium plan.' }, 403)
  }

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const { data: recentRuns, count: monthlyRuns, error: limitError } = await serviceClient.from('ai_tutor_runs')
    .select('created_at', { count: 'exact' }).eq('user_id', user.id)
    .gte('created_at', monthStart.toISOString()).order('created_at', { ascending: false }).limit(1)
  if (limitError) return jsonResponse({ error: 'Unable to validate tutor limits.' }, 503)
  if (!ownerOverride && (monthlyRuns ?? 0) >= TUTOR_MONTHLY_LIMIT) {
    return jsonResponse({ error: 'Monthly tutor limit reached.' }, 429)
  }
  if (!ownerOverride && recentRuns?.[0]?.created_at &&
    Date.now() - Date.parse(recentRuns[0].created_at) < TUTOR_COOLDOWN_MS) {
    return jsonResponse({ error: 'Please wait before building another session.' }, 429)
  }

  const runId = crypto.randomUUID()
  const requestId = crypto.randomUUID()
  const startedAt = performance.now()
  const trace: ToolTrace[] = []
  let inputTokens = 0
  let outputTokens = 0

  async function callModel(body: Record<string, unknown>) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${openAiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) throw new HttpError(response.status, payload?.error?.message ?? 'Tutor model request failed.')
    inputTokens += payload?.usage?.input_tokens ?? 0
    outputTokens += payload?.usage?.output_tokens ?? 0
    return payload
  }

  async function executeTool(name: string, args: { limit: number }) {
    const toolStartedAt = performance.now()
    const event: ToolTrace = { name, arguments: args, result: null, status: 'failed', latencyMs: 0, errorMessage: null }
    try {
      let result: unknown
      if (name === 'get_topic_mastery') {
        const response = await userClient.from('topic_mastery')
          .select('topic,attempts,know_count,semi_count,not_confident_count,mastery_score,last_reviewed_at,next_recommended_review_at')
          .eq('user_id', user.id).order('mastery_score').limit(args.limit)
        if (response.error) throw response.error
        result = response.data ?? []
      } else if (name === 'get_due_cards') {
        const response = await userClient.from('learning_cards')
          .select('id,question,generation_topic,latest_confidence,last_reviewed_at,next_review_at,know_count,semi_count,not_confident_count')
          .eq('user_id', user.id).eq('is_archived', false)
          .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
          .order('next_review_at', { ascending: true, nullsFirst: true }).limit(args.limit)
        if (response.error) throw response.error
        result = response.data ?? []
      } else if (name === 'get_recent_weaknesses') {
        const reviews = await userClient.from('card_reviews').select('card_id,confidence,reviewed_at')
          .eq('user_id', user.id).in('confidence', ['semi', 'not_confident'])
          .order('reviewed_at', { ascending: false }).limit(args.limit)
        if (reviews.error) throw reviews.error
        const cardIds = [...new Set((reviews.data ?? []).map(item => item.card_id))]
        const cards = cardIds.length ? await userClient.from('learning_cards')
          .select('id,question,generation_topic').eq('user_id', user.id).in('id', cardIds) : { data: [], error: null }
        if (cards.error) throw cards.error
        const cardsById = new Map((cards.data ?? []).map(item => [item.id, item]))
        result = (reviews.data ?? []).map(review => ({ confidence: review.confidence,
          reviewedAt: review.reviewed_at, card: cardsById.get(review.card_id) ?? null }))
      } else if (name === 'get_recent_learning_briefs') {
        const response = await userClient.from('learning_briefs').select('topic,title,kind,created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(args.limit)
        if (response.error) throw response.error
        result = response.data ?? []
      } else throw new Error(`Unsupported tutor tool: ${name}`)
      event.status = 'success'; event.result = compactToolResult(result); trace.push(event)
      return result
    } catch (error) {
      event.errorMessage = error instanceof Error ? error.message.slice(0, 500) : 'Tool execution failed'
      trace.push(event)
      throw error
    } finally { event.latencyMs = Math.round(performance.now() - toolStartedAt) }
  }

  async function persistRun(status: 'success' | 'failed', recommendation: unknown, failureReason: string | null) {
    const latencyMs = Math.round(performance.now() - startedAt)
    const { error: runError } = await serviceClient.rpc('record_ai_tutor_run', {
      p_run: { id: runId, user_id: user.id, request_id: requestId, model: tutorModel,
        prompt_version: TUTOR_PROMPT_VERSION, status, recommendation,
        tool_count: trace.length, latency_ms: latencyMs, input_tokens: inputTokens,
        output_tokens: outputTokens, estimated_cost_usd: estimateTutorCost(tutorModel, inputTokens, outputTokens),
        failure_reason: failureReason },
      p_trace: trace.map((event, index) => ({ sequence: index + 1, tool_name: event.name,
        arguments: event.arguments, result_summary: event.result, status: event.status,
        latency_ms: event.latencyMs, error_message: event.errorMessage })),
    })
    if (runError) throw new Error(`Unable to persist tutor run and trace: ${runError.message}`)
    return latencyMs
  }

  try {
    let response = await callModel({ model: tutorModel, instructions,
      input: 'Inspect my learning state and build my next study session.', tools,
      tool_choice: 'required', parallel_tool_calls: true, max_output_tokens: 1200,
      text: { format: { type: 'json_schema', name: 'adaptive_tutor_recommendation', strict: true, schema: recommendationSchema } } })
    let inspectedLearnerState = false
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const calls = getToolCalls(response)
      if (!calls.length) break
      if (trace.length + calls.length > MAX_TOOL_CALLS) throw new Error('Tutor exceeded its tool-call budget')
      const outputs = []
      for (const call of calls) {
        const args = parseToolArguments(call.arguments, call.name)
        const result = await executeTool(call.name, args)
        inspectedLearnerState = true
        outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) })
      }
      response = await callModel({ model: tutorModel, instructions, previous_response_id: response.id,
        input: outputs, tools, tool_choice: 'auto', parallel_tool_calls: true, max_output_tokens: 1200,
        text: { format: { type: 'json_schema', name: 'adaptive_tutor_recommendation', strict: true, schema: recommendationSchema } } })
    }
    if (!inspectedLearnerState) throw new Error('Tutor did not inspect learner state')
    if (getToolCalls(response).length) throw new Error('Tutor did not finish within its tool-round budget')
    const recommendation = parseTutorRecommendation(extractTutorText(response))
    const latencyMs = await persistRun('success', recommendation, null)
    return jsonResponse({ runId, requestId, recommendation,
      trace: trace.map((event, index) => ({ sequence: index + 1, tool: event.name, status: event.status, latencyMs: event.latencyMs })),
      meta: { model: tutorModel, promptVersion: TUTOR_PROMPT_VERSION, latencyMs,
        inputTokens, outputTokens, estimatedCostUsd: estimateTutorCost(tutorModel, inputTokens, outputTokens) } })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Adaptive tutor failed.'
    try { await persistRun('failed', null, message) } catch (persistError) { console.error(persistError) }
    return jsonResponse({ error: 'Unable to build a tutor session right now.', requestId }, error instanceof HttpError ? 502 : 500)
  }
})
