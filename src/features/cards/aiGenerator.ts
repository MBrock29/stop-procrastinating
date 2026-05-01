import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export interface GenerateCardsInput {
  topic: string
  seniority: string
  cardCount: number
}

export interface GeneratedCardDraft {
  question: string
  answer: string
}

function createLocalCards(input: GenerateCardsInput) {
  const normalizedTopic = input.topic.trim()
  const seniorityLabel = input.seniority.trim() || 'mid-level'

  return Array.from({ length: input.cardCount }, (_, index) => {
    const questionNumber = index + 1
    return {
      question: `${seniorityLabel} ${normalizedTopic}: question ${questionNumber}`,
      answer: `Key idea ${questionNumber} for ${normalizedTopic}: explain the trade-off, give a concrete example, and mention one common pitfall to avoid in production.`,
    }
  })
}

export async function generateCardsWithAi(input: GenerateCardsInput) {
  if (!hasSupabaseEnv) {
    return createLocalCards(input)
  }

  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured.')
  }

  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You must be signed in to generate cards.')
  }

  const functionUrl = `${env.supabaseUrl}/functions/v1/generate-learning-cards`
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: env.supabaseAnonKey!,
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as
    | { cards?: GeneratedCardDraft[]; error?: string }
    | undefined

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to generate cards right now.')
  }

  if (!payload?.cards?.length) {
    throw new Error('The generator returned no cards.')
  }

  return payload.cards
}
