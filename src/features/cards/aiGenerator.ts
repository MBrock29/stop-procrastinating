import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { AiProvider, PlanTier, SupportedAiModel } from '../../types/domain'

export interface GenerateCardsInput {
  topic: string
  cardCount: number
  requestedModel?: SupportedAiModel | null
  byokProvider?: AiProvider | null
  byokApiKey?: string | null
}

export interface GeneratedCardDraft {
  question: string
  answer: string
}

export interface GenerateCardsResult {
  cards: GeneratedCardDraft[]
  meta: {
    planTier: PlanTier
    provider: AiProvider
    model: string
    monthlyPacksUsed: number
    monthlyPackLimit: number | null
    maxCardsPerPack: number
    usedByok: boolean
    estimatedCostUsd: number | null
  }
}

function createLocalCards(input: GenerateCardsInput) {
  const normalizedTopic = input.topic.trim()

  return Array.from({ length: input.cardCount }, (_, index) => {
    const questionNumber = index + 1
    return {
      question: `${normalizedTopic}: question ${questionNumber}`,
      answer: `Key idea ${questionNumber} for ${normalizedTopic}: explain the trade-off, give a concrete example, and mention one common pitfall to avoid in production.`,
    }
  })
}

export async function generateCardsWithAi(input: GenerateCardsInput) {
  if (!hasSupabaseEnv) {
    return {
      cards: createLocalCards(input),
      meta: {
        planTier: 'free' as PlanTier,
        provider: 'openai' as AiProvider,
        model: env.openaiModel,
        monthlyPacksUsed: 0,
        monthlyPackLimit: 3,
        maxCardsPerPack: 10,
        usedByok: false,
        estimatedCostUsd: null,
      },
    } satisfies GenerateCardsResult
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
  let response: Response

  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey!,
        ...(input.byokApiKey ? { 'x-byok-api-key': input.byokApiKey } : {}),
        ...(input.byokProvider ? { 'x-byok-provider': input.byokProvider } : {}),
      },
      body: JSON.stringify({
        topic: input.topic,
        cardCount: input.cardCount,
        requestedModel: input.requestedModel ?? undefined,
      }),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Unable to reach the AI generation function. Check that the Supabase Edge Function is deployed and that your project URL/key are correct.',
      )
    }

    throw error
  }

  const payload = (await response.json()) as
    | { cards?: GeneratedCardDraft[]; meta?: GenerateCardsResult['meta']; error?: string }
    | undefined

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to generate cards right now.')
  }

  if (!payload?.cards?.length) {
    throw new Error('The generator returned no cards.')
  }

  return {
    cards: payload.cards,
    meta: payload.meta ?? {
      planTier: 'free',
      provider: 'openai',
      model: env.openaiModel,
      monthlyPacksUsed: 0,
      monthlyPackLimit: 3,
      maxCardsPerPack: 10,
      usedByok: false,
      estimatedCostUsd: null,
    },
  } satisfies GenerateCardsResult
}
