import { env } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { TutorResult, TutorRun } from '../../types/domain'
import { listLearningBriefs } from '../briefs/briefsRepository'
import { listLearningCards } from '../cards/cardsRepository'
import { buildDemoTutorResult } from './demoTutor'

interface TutorRunRow {
  id: string; user_id: string; request_id: string; model: string; prompt_version: string
  status: 'success' | 'failed'; recommendation: TutorRun['recommendation']; tool_count: number
  latency_ms: number; input_tokens: number | null; output_tokens: number | null
  estimated_cost_usd: number | string | null; failure_reason: string | null; created_at: string
}

function storageKey(userId: string) { return `stop-procrastinating.tutor-runs.${userId}` }
function readDemoRuns(userId: string): TutorRun[] {
  try { return JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? '[]') as TutorRun[] } catch { return [] }
}
function writeDemoRuns(userId: string, runs: TutorRun[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(runs.slice(0, 100)))
}
function mapRun(row: TutorRunRow): TutorRun {
  return { id: row.id, userId: row.user_id, requestId: row.request_id, model: row.model,
    promptVersion: row.prompt_version, status: row.status, recommendation: row.recommendation,
    toolCount: row.tool_count, latencyMs: row.latency_ms, inputTokens: row.input_tokens,
    outputTokens: row.output_tokens, estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
    failureReason: row.failure_reason, createdAt: row.created_at }
}

export async function generateTutorSession(userId: string): Promise<TutorResult> {
  const client = getSupabaseBrowserClient()
  if (!client) {
    const startedAt = performance.now()
    const { recommendation, trace } = buildDemoTutorResult(await listLearningCards(userId), await listLearningBriefs(userId))
    const createdAt = new Date().toISOString(); const runId = crypto.randomUUID(); const requestId = crypto.randomUUID()
    const result: TutorResult = { runId, requestId, recommendation, trace,
      meta: { model: 'deterministic-demo', promptVersion: 'adaptive-tutor-demo-v1',
        latencyMs: Math.round(performance.now() - startedAt), inputTokens: null, outputTokens: null, estimatedCostUsd: null } }
    writeDemoRuns(userId, [{ id: runId, userId, requestId, model: result.meta.model,
      promptVersion: result.meta.promptVersion, status: 'success', recommendation, toolCount: trace.length,
      latencyMs: result.meta.latencyMs, inputTokens: null, outputTokens: null, estimatedCostUsd: null,
      failureReason: null, createdAt }, ...readDemoRuns(userId)])
    return result
  }
  const { data: { session } } = await client.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in to use the tutor.')
  const response = await fetch(`${env.supabaseUrl}/functions/v1/adaptive-tutor`, {
    method: 'POST', signal: AbortSignal.timeout(90_000),
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: env.supabaseAnonKey!, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const payload = await response.json() as TutorResult & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Unable to build a tutor session.')
  return payload
}

export async function listTutorRuns(userId: string): Promise<TutorRun[]> {
  const client = getSupabaseBrowserClient()
  if (!client) return readDemoRuns(userId)
  const { data, error } = await client.from('ai_tutor_runs').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return (data ?? []).map(item => mapRun(item as TutorRunRow))
}
