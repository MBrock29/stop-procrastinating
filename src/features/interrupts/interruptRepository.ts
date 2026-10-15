import { getSupabaseBrowserClient } from '../../lib/supabase'
import { saveReviewedLearningCard } from '../cards/cardsRepository'
import { applyConfidenceToCard } from '../cards/scheduling'
import type {
  CardReview,
  ConfidenceRating,
  InterruptSession,
  LearningCard,
} from '../../types/domain'

interface InterruptSessionRow {
  source?: InterruptSession['source']
  id: string
  user_id: string
  blocked_domain: string
  triggered_at: string
  completed_at: string | null
  outcome?: InterruptSession['outcome']
  intervention_mode?: InterruptSession['interventionMode']
}

interface CardReviewRow {
  id: string
  card_id: string
  user_id: string
  interrupt_session_id: string
  confidence: ConfidenceRating
  reviewed_at: string
}

function interruptStorageKey(userId: string) {
  return `stop-procrastinating.interrupt-sessions.${userId}`
}

function reviewStorageKey(userId: string) {
  return `stop-procrastinating.card-reviews.${userId}`
}

function readInterruptSessions(userId: string) {
  const rawValue = window.localStorage.getItem(interruptStorageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return JSON.parse(rawValue) as InterruptSession[]
  } catch {
    return []
  }
}

function writeInterruptSessions(userId: string, sessions: InterruptSession[]) {
  window.localStorage.setItem(interruptStorageKey(userId), JSON.stringify(sessions))
}

function readCardReviews(userId: string) {
  const rawValue = window.localStorage.getItem(reviewStorageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return JSON.parse(rawValue) as CardReview[]
  } catch {
    return []
  }
}

function writeCardReviews(userId: string, reviews: CardReview[]) {
  window.localStorage.setItem(reviewStorageKey(userId), JSON.stringify(reviews))
}

export async function listCardReviews(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return readCardReviews(userId).sort((left, right) =>
      right.reviewedAt.localeCompare(left.reviewedAt),
    )
  }

  const { data, error } = await client
    .from('card_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })
    .limit(1000)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: (item as CardReviewRow).id,
    cardId: (item as CardReviewRow).card_id,
    userId: (item as CardReviewRow).user_id,
    interruptSessionId: (item as CardReviewRow).interrupt_session_id,
    confidence: (item as CardReviewRow).confidence,
    reviewedAt: (item as CardReviewRow).reviewed_at,
  }))
}

function mapInterruptRow(row: InterruptSessionRow): InterruptSession {
  return {
    source: row.source ?? 'unknown',
    id: row.id,
    userId: row.user_id,
    blockedDomain: row.blocked_domain,
    triggeredAt: row.triggered_at,
    completedAt: row.completed_at,
    outcome: row.outcome ?? (row.completed_at ? 'completed' : 'started'),
    interventionMode: row.intervention_mode ?? 'quick',
  }
}

export async function listInterruptSessions(userId: string) {
  const client = getSupabaseBrowserClient()
  if (!client) return readInterruptSessions(userId).map(item => ({ ...item,
    outcome: item.outcome ?? (item.completedAt ? 'completed' as const : 'started' as const),
    interventionMode: item.interventionMode ?? 'quick' as const }))
  const { data, error } = await client.from('interrupt_sessions').select('*').eq('user_id', userId)
    .order('triggered_at', { ascending: false }).limit(1000)
  if (error) throw error
  return (data ?? []).map(item => mapInterruptRow(item as InterruptSessionRow))
}

export async function createInterruptSession(userId: string, blockedDomain: string,
  interventionMode: InterruptSession['interventionMode'] = 'quick',
  source: InterruptSession['source'] = 'practice') {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextSession: InterruptSession = {
      source,
      id: crypto.randomUUID(),
      userId,
      blockedDomain,
      triggeredAt: new Date().toISOString(),
      completedAt: null,
      outcome: 'started',
      interventionMode,
    }
    const existing = readInterruptSessions(userId)
    writeInterruptSessions(userId, [nextSession, ...existing])
    return nextSession
  }

  const { data, error } = await client
    .from('interrupt_sessions')
    .insert({
      user_id: userId,
      blocked_domain: blockedDomain,
      intervention_mode: interventionMode,
      source,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapInterruptRow(data as InterruptSessionRow)
}

export async function completeInterruptSession(userId: string, sessionId: string) {
  const completedAt = new Date().toISOString()
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextSessions = readInterruptSessions(userId).map((session) =>
      session.id === sessionId ? { ...session, completedAt, outcome: 'completed' as const } : session,
    )
    writeInterruptSessions(userId, nextSessions)
    return
  }

  const { error } = await client
    .from('interrupt_sessions')
    .update({
      completed_at: completedAt,
      outcome: 'completed',
    })
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export async function bypassInterruptSession(userId: string, sessionId: string) {
  const completedAt = new Date().toISOString(); const client = getSupabaseBrowserClient()
  if (!client) {
    writeInterruptSessions(userId, readInterruptSessions(userId).map(item => item.id === sessionId ?
      { ...item, completedAt, outcome: 'bypassed' } : item)); return
  }
  const { error } = await client.from('interrupt_sessions').update({ completed_at: completedAt,
    outcome: 'bypassed' }).eq('id', sessionId).eq('user_id', userId)
  if (error) throw error
}

export async function submitInterruptReview(input: {
  userId: string
  sessionId: string
  card: LearningCard
  confidence: ConfidenceRating
}) {
  const reviewedAt = new Date()
  const updatedCard = applyConfidenceToCard(input.card, input.confidence, reviewedAt)
  const review: CardReview = {
    id: crypto.randomUUID(),
    cardId: input.card.id,
    userId: input.userId,
    interruptSessionId: input.sessionId,
    confidence: input.confidence,
    reviewedAt: reviewedAt.toISOString(),
  }

  await saveReviewedLearningCard(input.userId, updatedCard)

  const client = getSupabaseBrowserClient()

  if (!client) {
    const existing = readCardReviews(input.userId)
    writeCardReviews(input.userId, [review, ...existing])
    return {
      review,
      updatedCard,
    }
  }

  const { data, error } = await client
    .from('card_reviews')
    .insert({
      card_id: input.card.id,
      user_id: input.userId,
      interrupt_session_id: input.sessionId,
      confidence: input.confidence,
      reviewed_at: review.reviewedAt,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return {
    review: {
      id: (data as CardReviewRow).id,
      cardId: (data as CardReviewRow).card_id,
      userId: (data as CardReviewRow).user_id,
      interruptSessionId: (data as CardReviewRow).interrupt_session_id,
      confidence: (data as CardReviewRow).confidence,
      reviewedAt: (data as CardReviewRow).reviewed_at,
    },
    updatedCard,
  }
}
