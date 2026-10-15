import { describe, expect, it } from 'vitest'
import { applyConfidenceToCard, getCardPriority, selectNextDueCard, sortCardsForReview } from './scheduling'
import type { LearningCard } from '../../types/domain'

function createCard(overrides: Partial<LearningCard> = {}): LearningCard {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    userId: 'user-1',
    question: 'Question',
    answer: 'Answer',
    source: 'manual',
    generationTopic: null,
    generationBatchId: null,
    groundedSourceId: null,
    citationChunkIds: [],
    citationExcerpts: [],
    groundingScore: null,
    isUserEdited: false,
    latestConfidence: null,
    isArchived: false,
    lastReviewedAt: null,
    nextReviewAt: null,
    knowCount: 0,
    semiCount: 0,
    notConfidentCount: 0,
    createdAt: overrides.createdAt ?? '2026-05-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('getCardPriority', () => {
  it('puts unreviewed and not confident cards at the top', () => {
    expect(getCardPriority(createCard())).toBe(0)
    expect(getCardPriority(createCard({ latestConfidence: 'not_confident' }))).toBe(0)
    expect(getCardPriority(createCard({ latestConfidence: 'semi' }))).toBe(1)
    expect(getCardPriority(createCard({ latestConfidence: 'know' }))).toBe(2)
  })
})

describe('applyConfidenceToCard', () => {
  it('increments the matching confidence bucket and schedules the next review', () => {
    const card = createCard()
    const updated = applyConfidenceToCard(card, 'semi', new Date('2026-05-01T10:00:00.000Z'))

    expect(updated.semiCount).toBe(1)
    expect(updated.knowCount).toBe(0)
    expect(updated.notConfidentCount).toBe(0)
    expect(updated.latestConfidence).toBe('semi')
    expect(updated.nextReviewAt).toBe('2026-05-02T10:00:00.000Z')
  })
})

describe('sortCardsForReview', () => {
  it('sorts cards by priority bucket before last reviewed time', () => {
    const know = createCard({ id: 'know', latestConfidence: 'know' })
    const semi = createCard({ id: 'semi', latestConfidence: 'semi' })
    const notConfident = createCard({ id: 'not-confident', latestConfidence: 'not_confident' })

    expect(sortCardsForReview([know, semi, notConfident]).map((card) => card.id)).toEqual([
      'not-confident',
      'semi',
      'know',
    ])
  })

  it('keeps older cards first within the same priority bucket', () => {
    const older = createCard({
      id: 'older',
      latestConfidence: 'semi',
      lastReviewedAt: '2026-05-01T10:00:00.000Z',
    })
    const newer = createCard({
      id: 'newer',
      latestConfidence: 'semi',
      lastReviewedAt: '2026-05-05T10:00:00.000Z',
    })

    expect(sortCardsForReview([newer, older]).map((card) => card.id)).toEqual([
      'older',
      'newer',
    ])
  })
})

describe('selectNextDueCard', () => {
  it('returns no due card when every card is scheduled in the future', () => {
    expect(selectNextDueCard([createCard({ nextReviewAt: '2099-01-01T00:00:00.000Z' })])).toBeNull()
  })
  it('returns the first card in the review priority order', () => {
    const know = createCard({ id: 'know', latestConfidence: 'know' })
    const unmarked = createCard({ id: 'unmarked', latestConfidence: null })

    expect(selectNextDueCard([know, unmarked])?.id).toBe('unmarked')
  })
})

it('prioritizes due cards over future cards, and brings difficult cards back sooner', () => {
  const now = new Date('2026-05-01T10:00:00Z')
  const easy = createCard({ id: 'due', latestConfidence: 'know', nextReviewAt: now.toISOString() })
  const future = createCard({ id: 'future', nextReviewAt: '2026-05-02T10:00:00Z' })
  expect(sortCardsForReview([future, easy], now)[0].id).toBe('due')
  expect(applyConfidenceToCard(easy, 'not_confident', now).nextReviewAt).toBe('2026-05-01T10:10:00.000Z')
  expect(applyConfidenceToCard(easy, 'know', now).nextReviewAt).toBe('2026-05-04T10:00:00.000Z')
})
