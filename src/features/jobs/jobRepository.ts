import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export type GenerationJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'dead_letter'
export interface GenerationJob { id: string; jobType: 'cards' | 'grounded_cards' | 'brief';
  status: GenerationJobStatus; attemptCount: number; maxAttempts: number; nextAttemptAt: string;
  result: Record<string, unknown> | null; errorMessage: string | null; createdAt: string; completedAt: string | null }

export async function queueCardGeneration(input: { topic: string; cardCount: number; idempotencyKey: string }) {
  const client = getSupabaseBrowserClient()
  if (!client || !hasSupabaseEnv) throw new Error('Jobs require a configured Supabase project.')
  const { data: { session } } = await client.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in.')
  const response = await fetch(`${env.supabaseUrl}/functions/v1/queue-learning-generation`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, apikey: env.supabaseAnonKey!,
      'Content-Type': 'application/json' }, body: JSON.stringify({ jobType: 'cards',
      idempotencyKey: input.idempotencyKey, payload: { topic: input.topic, cardCount: input.cardCount } }) })
  const body = await response.json() as { job?: unknown; reused?: boolean; error?: string }
  if (!response.ok || !body.job) throw new Error(body.error ?? 'Unable to queue generation.')
  return body
}

export async function listGenerationJobs(userId: string): Promise<GenerationJob[]> {
  const client = getSupabaseBrowserClient(); if (!client) return []
  const { data, error } = await client.from('ai_generation_jobs').select(
    'id,job_type,status,attempt_count,max_attempts,next_attempt_at,result,error_message,created_at,completed_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
  if (error) throw error
  return (data ?? []).map(row => ({ id: row.id, jobType: row.job_type, status: row.status,
    attemptCount: row.attempt_count, maxAttempts: row.max_attempts, nextAttemptAt: row.next_attempt_at,
    result: row.result, errorMessage: row.error_message, createdAt: row.created_at, completedAt: row.completed_at }))
}
