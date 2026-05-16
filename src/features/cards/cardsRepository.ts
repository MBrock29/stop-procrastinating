import { getSupabaseBrowserClient } from '../../lib/supabase'
import { selectNextDueCard } from './scheduling'
import type { LearningCard } from '../../types/domain'

interface LearningCardRow {
  id: string
  user_id: string
  question: string
  answer: string
  source: 'manual' | 'ai'
  generation_topic: string | null
  generation_batch_id: string | null
  is_user_edited: boolean
  latest_confidence: 'know' | 'semi' | 'not_confident' | null
  is_archived: boolean
  last_reviewed_at: string | null
  next_review_at: string | null
  know_count: number
  semi_count: number
  not_confident_count: number
  created_at: string
  updated_at: string
}

interface SaveLearningCardInput {
  question: string
  answer: string
  source?: 'manual' | 'ai'
  generationTopic?: string | null
  generationBatchId?: string | null
  isUserEdited?: boolean
}

function isMissingGenerationBatchIdColumn(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('generation_batch_id')
  )
}

function mapRow(row: LearningCardRow): LearningCard {
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    answer: row.answer,
    source: row.source,
    generationTopic: row.generation_topic,
    generationBatchId: row.generation_batch_id,
    isUserEdited: row.is_user_edited,
    latestConfidence: row.latest_confidence,
    isArchived: row.is_archived,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    knowCount: row.know_count,
    semiCount: row.semi_count,
    notConfidentCount: row.not_confident_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function storageKey(userId: string) {
  return `stop-procrastinating.learning-cards.${userId}`
}

function readDemoCards(userId: string) {
  const rawValue = window.localStorage.getItem(storageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return JSON.parse(rawValue) as LearningCard[]
  } catch {
    return []
  }
}

function writeDemoCards(userId: string, cards: LearningCard[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(cards))
}

export async function listLearningCards(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return readDemoCards(userId).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  const { data, error } = await client
    .from('learning_cards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => mapRow(item as LearningCardRow))
}

export async function createLearningCard(userId: string, input: SaveLearningCardInput) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const now = new Date().toISOString()
    const nextCard: LearningCard = {
      id: crypto.randomUUID(),
      userId,
      question: input.question,
      answer: input.answer,
      source: input.source ?? 'manual',
      generationTopic: input.generationTopic ?? null,
      generationBatchId: input.generationBatchId ?? null,
      isUserEdited: input.isUserEdited ?? false,
      latestConfidence: null,
      isArchived: false,
      lastReviewedAt: null,
      nextReviewAt: null,
      knowCount: 0,
      semiCount: 0,
      notConfidentCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    const existing = readDemoCards(userId)
    writeDemoCards(userId, [nextCard, ...existing])
    return nextCard
  }

  const basePayload = {
    user_id: userId,
    question: input.question,
    answer: input.answer,
    source: input.source ?? 'manual',
    generation_topic: input.generationTopic ?? null,
    is_user_edited: input.isUserEdited ?? false,
    latest_confidence: null,
  }

  let response = await client
    .from('learning_cards')
    .insert({
      ...basePayload,
      generation_batch_id: input.generationBatchId ?? null,
    })
    .select()
    .single()

  if (response.error && isMissingGenerationBatchIdColumn(response.error)) {
    response = await client.from('learning_cards').insert(basePayload).select().single()
  }

  if (response.error) {
    throw response.error
  }

  return mapRow(response.data as LearningCardRow)
}

export async function updateLearningCard(
  userId: string,
  cardId: string,
  input: SaveLearningCardInput,
) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    let updatedCard: LearningCard | null = null
    const nextItems = readDemoCards(userId).map((item) => {
      if (item.id !== cardId) {
        return item
      }

      updatedCard = {
        ...item,
        question: input.question,
        answer: input.answer,
        isUserEdited: true,
        updatedAt: new Date().toISOString(),
      }

      return updatedCard
    })
    writeDemoCards(userId, nextItems)
    return updatedCard
  }

  const { data, error } = await client
    .from('learning_cards')
    .update({
      question: input.question,
      answer: input.answer,
      is_user_edited: input.isUserEdited ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as LearningCardRow)
}

export async function setLearningCardArchivedState(
  userId: string,
  cardId: string,
  isArchived: boolean,
) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    let updatedCard: LearningCard | null = null
    const nextItems = readDemoCards(userId).map((item) => {
      if (item.id !== cardId) {
        return item
      }

      updatedCard = {
        ...item,
        isArchived,
        updatedAt: new Date().toISOString(),
      }

      return updatedCard
    })
    writeDemoCards(userId, nextItems)
    return updatedCard
  }

  const { data, error } = await client
    .from('learning_cards')
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as LearningCardRow)
}

export async function deleteLearningCard(userId: string, cardId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextItems = readDemoCards(userId).filter((item) => item.id !== cardId)
    writeDemoCards(userId, nextItems)
    return
  }

  const { error } = await client
    .from('learning_cards')
    .delete()
    .eq('id', cardId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export async function deleteLearningCards(userId: string, cardIds: string[]) {
  if (cardIds.length === 0) {
    return
  }

  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextItems = readDemoCards(userId).filter((item) => !cardIds.includes(item.id))
    writeDemoCards(userId, nextItems)
    return
  }

  const { error } = await client
    .from('learning_cards')
    .delete()
    .eq('user_id', userId)
    .in('id', cardIds)

  if (error) {
    throw error
  }
}

export async function getNextLearningCard(userId: string) {
  const cards = await listLearningCards(userId)
  return selectNextDueCard(cards)
}

export async function saveReviewedLearningCard(userId: string, card: LearningCard) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextItems = readDemoCards(userId).map((item) => (item.id === card.id ? card : item))
    writeDemoCards(userId, nextItems)
    return card
  }

  const basePayload = {
    question: card.question,
    answer: card.answer,
    source: card.source,
    generation_topic: card.generationTopic,
    is_user_edited: card.isUserEdited,
    latest_confidence: card.latestConfidence,
    is_archived: card.isArchived,
    last_reviewed_at: card.lastReviewedAt,
    next_review_at: card.nextReviewAt,
    know_count: card.knowCount,
    semi_count: card.semiCount,
    not_confident_count: card.notConfidentCount,
    updated_at: card.updatedAt,
  }

  let response = await client
    .from('learning_cards')
    .update({
      ...basePayload,
      generation_batch_id: card.generationBatchId,
    })
    .eq('id', card.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (response.error && isMissingGenerationBatchIdColumn(response.error)) {
    response = await client
      .from('learning_cards')
      .update(basePayload)
      .eq('id', card.id)
      .eq('user_id', userId)
      .select()
      .single()
  }

  if (response.error) {
    throw response.error
  }

  return mapRow(response.data as LearningCardRow)
}

export async function bulkCreateLearningCards(userId: string, inputs: SaveLearningCardInput[]) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const now = new Date().toISOString()
    const nextCards = inputs.map<LearningCard>((input) => ({
      id: crypto.randomUUID(),
      userId,
      question: input.question,
      answer: input.answer,
      source: input.source ?? 'manual',
      generationTopic: input.generationTopic ?? null,
      generationBatchId: input.generationBatchId ?? null,
      isUserEdited: input.isUserEdited ?? false,
      latestConfidence: null,
      isArchived: false,
      lastReviewedAt: null,
      nextReviewAt: null,
      knowCount: 0,
      semiCount: 0,
      notConfidentCount: 0,
      createdAt: now,
      updatedAt: now,
    }))
    const existing = readDemoCards(userId)
    writeDemoCards(userId, [...nextCards, ...existing])
    return nextCards
  }

  const basePayload = inputs.map((input) => ({
    user_id: userId,
    question: input.question,
    answer: input.answer,
    source: input.source ?? 'manual',
    generation_topic: input.generationTopic ?? null,
    is_user_edited: input.isUserEdited ?? false,
    latest_confidence: null,
  }))

  let response = await client
    .from('learning_cards')
    .insert(
      inputs.map((input, index) => ({
        ...basePayload[index],
        generation_batch_id: input.generationBatchId ?? null,
      })),
    )
    .select()

  if (response.error && isMissingGenerationBatchIdColumn(response.error)) {
    response = await client.from('learning_cards').insert(basePayload).select()
  }

  if (response.error) {
    throw response.error
  }

  return (response.data ?? []).map((item) => mapRow(item as LearningCardRow))
}
