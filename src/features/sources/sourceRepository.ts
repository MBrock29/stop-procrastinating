import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export interface LearningSource {
  id: string
  title: string
  sourceType: 'text' | 'notes' | 'url' | 'document'
  sourceUrl: string | null
  chunkCount: number
  embeddingModel: string
  status: 'processing' | 'ready' | 'failed'
  createdAt: string
}
export interface GroundedGenerationResult {
  cards: Array<{ id: string; question: string; answer: string; sourceId: string; groundingScore: number;
    citations: Array<{ chunkId: string; chunkIndex: number; excerpt: string; similarity: number;
      sourceTitle: string; sourceUrl: string | null }> }>
  retrieval: { sourceId: string; sourceTitle: string; retrievedChunkCount: number; similarities: number[] }
  meta: { requestId: string; model: string; embeddingModel: string; promptVersion: string;
    groundingPassRate: number; latencyMs: number; inputTokens: number | null;
    outputTokens: number | null; estimatedCostUsd: number | null }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const client = getSupabaseBrowserClient()
  if (!client || !hasSupabaseEnv) throw new Error('Grounded learning requires a configured Supabase project.')
  const { data: { session } } = await client.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in.')
  const response = await fetch(`${env.supabaseUrl}/functions/v1/${path}`, {
    method: 'POST', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: env.supabaseAnonKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Grounded learning request failed.')
  return payload
}

export async function listLearningSources(userId: string): Promise<LearningSource[]> {
  const client = getSupabaseBrowserClient()
  if (!client) return []
  const { data, error } = await client.from('learning_sources')
    .select('id,title,source_type,source_url,chunk_count,embedding_model,status,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(item => ({ id: item.id, title: item.title, sourceType: item.source_type,
    sourceUrl: item.source_url, chunkCount: item.chunk_count, embeddingModel: item.embedding_model,
    status: item.status, createdAt: item.created_at }))
}
export function ingestLearningSource(input: { title: string; sourceType: LearningSource['sourceType']; sourceUrl?: string | null; content: string }) {
  return request<{ source: { id: string }; reused: boolean }>('ingest-learning-source', input)
}
export function generateGroundedCards(input: { sourceId: string; topic: string; cardCount: number }) {
  return request<GroundedGenerationResult>('generate-grounded-learning-cards', input)
}
export async function deleteLearningSource(userId: string, sourceId: string) {
  const client = getSupabaseBrowserClient()
  if (!client) return
  const { error } = await client.from('learning_sources').delete().eq('id', sourceId).eq('user_id', userId)
  if (error) throw error
}
