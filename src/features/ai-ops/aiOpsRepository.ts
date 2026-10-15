import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { AiGenerationEvent, TutorRun } from '../../types/domain'
import { listAiGenerationEvents } from '../ai-access/aiAccessRepository'
import { listTutorRuns } from '../tutor/tutorRepository'
import { buildAiOpsSummary } from './aiOpsMetrics'

interface EvalRunRow { report: { averageScore?: number } | null }

export async function getAiOpsSummary(userId: string) {
  const client = getSupabaseBrowserClient()
  if (!client) return buildAiOpsSummary(await listAiGenerationEvents(userId), await listTutorRuns(userId), null)
  const start = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [generation, tutors, evaluation, grounded] = await Promise.all([
    client.from('ai_generation_events').select('*').eq('user_id', userId).gte('created_at', start)
      .order('created_at', { ascending: false }).limit(1000),
    client.from('ai_tutor_runs').select('*').eq('user_id', userId).gte('created_at', start)
      .order('created_at', { ascending: false }).limit(1000),
    client.from('ai_eval_runs').select('report').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('grounded_generation_events').select('status,grounding_pass_rate').eq('user_id', userId)
      .gte('created_at', start).order('created_at', { ascending: false }).limit(1000),
  ])
  if (generation.error) throw generation.error
  if (tutors.error) throw tutors.error
  if (evaluation.error) throw evaluation.error
  if (grounded.error) throw grounded.error
  const events = (generation.data ?? []).map(row => ({
    id: row.id, userId: row.user_id, requestId: row.request_id, promptVersion: row.prompt_version,
    latencyMs: row.latency_ms, topic: row.topic, planTier: row.plan_tier, provider: row.provider,
    model: row.model, cardCount: row.card_count, status: row.status, inputTokens: row.input_tokens,
    outputTokens: row.output_tokens, estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
    usedByok: row.used_byok, failureReason: row.failure_reason, createdAt: row.created_at,
  })) as AiGenerationEvent[]
  const runs = (tutors.data ?? []).map(row => ({
    id: row.id, userId: row.user_id, requestId: row.request_id, model: row.model,
    promptVersion: row.prompt_version, status: row.status, recommendation: row.recommendation,
    toolCount: row.tool_count, latencyMs: row.latency_ms, inputTokens: row.input_tokens,
    outputTokens: row.output_tokens, estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
    failureReason: row.failure_reason, createdAt: row.created_at,
  })) as TutorRun[]
  const evalRow = evaluation.data as EvalRunRow | null
  const score = typeof evalRow?.report?.averageScore === 'number' ? evalRow.report.averageScore : null
  return buildAiOpsSummary(events, runs, score, (grounded.data ?? []).map(row => ({
    status: row.status as 'success' | 'failed',
    groundingPassRate: row.grounding_pass_rate == null ? null : Number(row.grounding_pass_rate),
  })))
}
