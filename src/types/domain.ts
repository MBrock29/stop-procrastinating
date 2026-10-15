export interface UserProfile {
  id: string
  email: string
}

export type PlanTier = 'free' | 'pro' | 'premium' | 'byok'
export type AiProvider = 'openai' | 'openrouter'
export type SupportedAiModel = 'gpt-4.1-mini' | 'gpt-5-mini' | 'gpt-5.4-mini'
export type RedirectBackMode = 'manual' | 'after_cards'
export type PremiumInterruptMode = 'cards' | 'summary'
export type InterventionMode = 'quick' | 'focus' | 'intentional' | 'soft' | 'hard' | 'smart'

export interface BlockedDomain {
  id: string
  userId: string
  domain: string
  isActive: boolean
  scheduleDays: number[]
  scheduleAllDay: boolean
  scheduleStart: string
  scheduleEnd: string
  interventionMode: InterventionMode
  pausedUntil: string | null
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
  groundedSourceId: string | null
  citationChunkIds: string[]
  citationExcerpts: string[]
  groundingScore: number | null
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
  source?: 'extension' | 'practice' | 'onboarding' | 'unknown'
  id: string
  userId: string
  blockedDomain: string
  triggeredAt: string
  completedAt: string | null
  outcome: 'started' | 'completed' | 'bypassed'
  interventionMode: InterventionMode
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
  premiumInterruptMode: PremiumInterruptMode
  redirectBackMode: RedirectBackMode
  redirectBackCardCount: number
  createdAt: string
  updatedAt: string
}

export type LearningBriefKind = 'summary' | 'briefing'

export interface LearningBrief {
  id: string
  userId: string
  topic: string
  generationBatchId: string | null
  title: string
  content: string
  kind: LearningBriefKind
  createdAt: string
  updatedAt: string
}

export interface ByokCredentialStatus {
  provider: AiProvider
  lastFour: string
  updatedAt: string
}

export type BillingInterval = 'month' | 'year'
export type BillingSubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'

export interface UserBillingAccount {
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  planTier: Exclude<PlanTier, 'byok'>
  billingInterval: BillingInterval | null
  billingCurrency: string | null
  subscriptionStatus: BillingSubscriptionStatus
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  createdAt: string
  updatedAt: string
}

export type AiGenerationStatus = 'success' | 'limit_exceeded' | 'rate_limited' | 'blocked' | 'failed'

export interface AiGenerationEvent {
  requestId?: string | null
  promptVersion?: string | null
  latencyMs?: number | null
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

export interface TutorRecommendation {
  headline: string
  focusTopic: string
  reason: string
  actions: string[]
  estimatedMinutes: number
  confidence: 'high' | 'medium' | 'low'
}

export type TutorToolName =
  | 'get_topic_mastery'
  | 'get_due_cards'
  | 'get_recent_weaknesses'
  | 'get_recent_learning_briefs'

export interface TutorTraceItem {
  sequence: number
  tool: TutorToolName
  status: 'success' | 'failed'
  latencyMs: number
}

export interface TutorRun {
  id: string
  userId: string
  requestId: string
  model: string
  promptVersion: string
  status: 'success' | 'failed'
  recommendation: TutorRecommendation | null
  toolCount: number
  latencyMs: number
  inputTokens: number | null
  outputTokens: number | null
  estimatedCostUsd: number | null
  failureReason: string | null
  createdAt: string
}

export interface TutorResult {
  runId: string
  requestId: string
  recommendation: TutorRecommendation
  trace: TutorTraceItem[]
  meta: {
    model: string
    promptVersion: string
    latencyMs: number
    inputTokens: number | null
    outputTokens: number | null
    estimatedCostUsd: number | null
  }
}
