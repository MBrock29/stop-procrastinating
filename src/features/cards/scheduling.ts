import type { ConfidenceRating, LearningCard } from '../../types/domain'

export function getCardPriority(card: LearningCard) {
  if (!card.latestConfidence || card.latestConfidence === 'not_confident') {
    return 0
  }

  if (card.latestConfidence === 'semi') {
    return 1
  }

  return 2
}

export function applyConfidenceToCard(
  card: LearningCard,
  confidence: ConfidenceRating,
  reviewedAt = new Date(),
): LearningCard {
  return {
    ...card,
    latestConfidence: confidence,
    lastReviewedAt: reviewedAt.toISOString(),
    nextReviewAt: null,
    knowCount: card.knowCount + (confidence === 'know' ? 1 : 0),
    semiCount: card.semiCount + (confidence === 'semi' ? 1 : 0),
    notConfidentCount: card.notConfidentCount + (confidence === 'not_confident' ? 1 : 0),
    updatedAt: reviewedAt.toISOString(),
  }
}

export function sortCardsForReview(cards: LearningCard[]) {
  return cards
    .filter((card) => !card.isArchived)
    .sort((left, right) => {
      const priorityDelta = getCardPriority(left) - getCardPriority(right)

      if (priorityDelta !== 0) {
        return priorityDelta
      }

      const leftValue = left.lastReviewedAt ?? left.createdAt
      const rightValue = right.lastReviewedAt ?? right.createdAt
      return leftValue.localeCompare(rightValue)
    })
}

export function selectNextDueCard(cards: LearningCard[]) {
  return sortCardsForReview(cards)[0] ?? null
}
