import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { LearningBrief, LearningBriefKind } from '../../types/domain'

interface LearningBriefRow {
  id: string
  user_id: string
  topic: string
  generation_batch_id: string | null
  title: string
  content: string
  kind: LearningBriefKind
  created_at: string
  updated_at: string
}

function storageKey(userId: string) {
  return `stop-procrastinating.learning-briefs.${userId}`
}

function readDemoBriefs(userId: string) {
  const rawValue = window.localStorage.getItem(storageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return JSON.parse(rawValue) as LearningBrief[]
  } catch {
    return []
  }
}

function writeDemoBriefs(userId: string, briefs: LearningBrief[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(briefs))
}

function mapRow(row: LearningBriefRow): LearningBrief {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    generationBatchId: row.generation_batch_id,
    title: row.title,
    content: row.content,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listLearningBriefs(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return readDemoBriefs(userId).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )
  }

  const { data, error } = await client
    .from('learning_briefs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => mapRow(item as LearningBriefRow))
}

export async function createLearningBrief(
  userId: string,
  input: Pick<
    LearningBrief,
    'topic' | 'generationBatchId' | 'title' | 'content' | 'kind'
  >,
) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const now = new Date().toISOString()
    const nextBrief: LearningBrief = {
      id: crypto.randomUUID(),
      userId,
      topic: input.topic,
      generationBatchId: input.generationBatchId ?? null,
      title: input.title,
      content: input.content,
      kind: input.kind,
      createdAt: now,
      updatedAt: now,
    }
    writeDemoBriefs(userId, [nextBrief, ...readDemoBriefs(userId)])
    return nextBrief
  }

  const { data, error } = await client
    .from('learning_briefs')
    .insert({
      user_id: userId,
      topic: input.topic,
      generation_batch_id: input.generationBatchId ?? null,
      title: input.title,
      content: input.content,
      kind: input.kind,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as LearningBriefRow)
}

export async function deleteLearningBrief(userId: string, briefId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    writeDemoBriefs(
      userId,
      readDemoBriefs(userId).filter((brief) => brief.id !== briefId),
    )
    return
  }

  const { error } = await client
    .from('learning_briefs')
    .delete()
    .eq('id', briefId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
