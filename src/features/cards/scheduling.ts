import type { ConfidenceRating, LearningCard } from '../../types/domain'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const confidenceDelayMap: Record<ConfidenceRating, number> = {
  know: 14,
  semi: 5,
  not_confident: 1,
}

export function getNextReviewAt(confidence: ConfidenceRating, from = new Date()) {
  return new Date(from.getTime() + confidenceDelayMap[confidence] * DAY_IN_MS).toISOString()
}

export function applyConfidenceToCard(
  card: LearningCard,
  confidence: ConfidenceRating,
  reviewedAt = new Date(),
): LearningCard {
  const nextReviewAt = getNextReviewAt(confidence, reviewedAt)

  return {
    ...card,
    lastReviewedAt: reviewedAt.toISOString(),
    nextReviewAt,
    knowCount: card.knowCount + (confidence === 'know' ? 1 : 0),
    semiCount: card.semiCount + (confidence === 'semi' ? 1 : 0),
    notConfidentCount: card.notConfidentCount + (confidence === 'not_confident' ? 1 : 0),
    updatedAt: reviewedAt.toISOString(),
  }
}

export function selectNextDueCard(cards: LearningCard[], now = new Date()) {
  const activeCards = cards.filter((card) => !card.isArchived)

  const dueCard = activeCards
    .filter((card) => !card.nextReviewAt || new Date(card.nextReviewAt) <= now)
    .sort((left, right) => {
      const leftValue = left.nextReviewAt ?? ''
      const rightValue = right.nextReviewAt ?? ''
      return leftValue.localeCompare(rightValue)
    })[0]

  if (dueCard) {
    return dueCard
  }

  return activeCards.sort((left, right) => {
    const leftValue = left.lastReviewedAt ?? left.createdAt
    const rightValue = right.lastReviewedAt ?? right.createdAt
    return leftValue.localeCompare(rightValue)
  })[0] ?? null
}
