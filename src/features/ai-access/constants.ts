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
    description: 'The core focus loop with a small monthly learning-material allowance.',
    monthlyPackLimit: 3,
    maxCardsPerPack: 10,
    maxStoredCards: 100,
    defaultModel: 'gpt-4.1-mini',
  },
  pro: {
    label: 'Pro',
    description: 'Legacy paid access with a larger learning-material allowance.',
    monthlyPackLimit: 25,
    maxCardsPerPack: 100,
    maxStoredCards: 2500,
    defaultModel: 'gpt-5-mini',
  },
  premium: {
    label: 'Premium',
    description: 'Personalized guidance, your own material, and richer interruptions.',
    monthlyPackLimit: 100,
    maxCardsPerPack: 100,
    maxStoredCards: 10000,
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
