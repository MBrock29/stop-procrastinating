export interface UserProfile {
  id: string
  email: string
}

export type PlanTier = 'free' | 'pro' | 'byok'
export type AiProvider = 'openai' | 'openrouter'
export type SupportedAiModel = 'gpt-4.1-mini' | 'gpt-5.4-mini'
export type RedirectBackMode = 'manual' | 'after_cards'

export interface BlockedDomain {
  id: string
  userId: string
  domain: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LearningCard {
  id: string
  userId: string
  question: string
  answer: string
  source: 'manual' | 'ai'
  generationTopic: string | null
  generationBatchId: string | null
  isUserEdited: boolean
  latestConfidence: ConfidenceRating | null
  isArchived: boolean
  lastReviewedAt: string | null
  nextReviewAt: string | null
  knowCount: number
  semiCount: number
  notConfidentCount: number
  createdAt: string
  updatedAt: string
}

export interface InterruptSession {
  id: string
  userId: string
  blockedDomain: string
  triggeredAt: string
  completedAt: string | null
}

export type ConfidenceRating = 'know' | 'semi' | 'not_confident'

export interface CardReview {
  id: string
  cardId: string
  userId: string
  interruptSessionId: string
  confidence: ConfidenceRating
  reviewedAt: string
}

export interface AiAccessSettings {
  userId: string
  planTier: PlanTier
  byokProvider: AiProvider
  preferredModel: SupportedAiModel
  showContinueToSiteButton: boolean
  redirectBackMode: RedirectBackMode
  redirectBackCardCount: number
  createdAt: string
  updatedAt: string
}

export interface ByokCredentialStatus {
  provider: AiProvider
  lastFour: string
  updatedAt: string
}

export type AiGenerationStatus = 'success' | 'limit_exceeded' | 'rate_limited' | 'blocked' | 'failed'

export interface AiGenerationEvent {
  id: string
  userId: string
  topic: string
  planTier: PlanTier
  provider: AiProvider
  model: string
  cardCount: number
  status: AiGenerationStatus
  inputTokens: number | null
  outputTokens: number | null
  estimatedCostUsd: number | null
  usedByok: boolean
  failureReason: string | null
  createdAt: string
}
