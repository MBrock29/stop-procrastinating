import { getSupabaseBrowserClient } from '../../lib/supabase'
import { selectNextDueCard } from './scheduling'
import type { LearningCard } from '../../types/domain'

interface LearningCardRow {
  id: string
  user_id: string
  question: string
  answer: string
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
}

function mapRow(row: LearningCardRow): LearningCard {
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    answer: row.answer,
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

  const { data, error } = await client
    .from('learning_cards')
    .insert({
      user_id: userId,
      question: input.question,
      answer: input.answer,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as LearningCardRow)
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

  const { data, error } = await client
    .from('learning_cards')
    .update({
      question: card.question,
      answer: card.answer,
      is_archived: card.isArchived,
      last_reviewed_at: card.lastReviewedAt,
      next_review_at: card.nextReviewAt,
      know_count: card.knowCount,
      semi_count: card.semiCount,
      not_confident_count: card.notConfidentCount,
      updated_at: card.updatedAt,
    })
    .eq('id', card.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as LearningCardRow)
}
