export interface UserProfile {
  id: string
  email: string
}

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
