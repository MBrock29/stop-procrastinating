import type { AiProvider, PlanTier, SupportedAiModel } from '../../types/domain'

export interface TierPolicy {
  label: string
  description: string
  monthlyPackLimit: number | null
  maxCardsPerPack: number
  maxStoredCards: number | null
  defaultModel: SupportedAiModel
}

export const SUPPORTED_AI_MODELS: SupportedAiModel[] = [
  'gpt-4.1-mini',
  'gpt-5-mini',
  'gpt-5.4-mini',
]
export const SUPPORTED_AI_PROVIDERS: AiProvider[] = ['openai', 'openrouter']

export const TIER_POLICIES: Record<PlanTier, TierPolicy> = {
  free: {
    label: 'Free',
    description: 'A light monthly allowance on the lighter hosted model.',
    monthlyPackLimit: 3,
    maxCardsPerPack: 10,
    maxStoredCards: 100,
    defaultModel: 'gpt-4.1-mini',
  },
  pro: {
    label: 'Pro',
    description: 'Higher-output packs on the stronger hosted model.',
    monthlyPackLimit: 25,
    maxCardsPerPack: 100,
    maxStoredCards: 1000,
    defaultModel: 'gpt-5-mini',
  },
  premium: {
    label: 'Premium',
    description: 'Deeper learning tools, summaries, and richer interrupts.',
    monthlyPackLimit: 100,
    maxCardsPerPack: 100,
    maxStoredCards: 5000,
    defaultModel: 'gpt-5.4-mini',
  },
  byok: {
    label: 'Bring your own key',
    description: 'Use your own provider key and choose between the supported models.',
    monthlyPackLimit: null,
    maxCardsPerPack: 100,
    maxStoredCards: 500,
    defaultModel: 'gpt-4.1-mini',
  },
}

export const FREE_PLAN_MODEL: SupportedAiModel = 'gpt-4.1-mini'
export const PRO_PLAN_MODEL: SupportedAiModel = 'gpt-5-mini'

export const AI_REQUEST_COOLDOWN_SECONDS = 10
