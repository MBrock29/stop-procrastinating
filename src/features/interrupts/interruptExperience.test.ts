import { describe, expect, it } from 'vitest'
import type { LearningCard } from '../../types/domain'
import { getSafeReturnUrl, selectInterruptCards } from './interruptExperience'

function card(
  id: string,
  topic: string,
  overrides: Partial<LearningCard> = {},
): LearningCard {
  return {
    id,
    userId: 'user',
    question: 'Question',
    answer: 'Answer',
    source: 'manual',
    generationTopic: topic,
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
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
    ...overrides,
  }
}

describe('safe continuation', () => {
  it('only allows matching HTTP destinations without embedded credentials', () => {
    expect(getSafeReturnUrl('https://reddit.com/r/french', 'reddit.com')).toBe(
      'https://reddit.com/r/french',
    )
    expect(getSafeReturnUrl('https://evil.example', 'reddit.com')).toBeNull()
    expect(getSafeReturnUrl('javascript:alert(1)', 'reddit.com')).toBeNull()
    expect(
      getSafeReturnUrl('https://user:password@reddit.com', 'reddit.com'),
    ).toBeNull()
    expect(getSafeReturnUrl('https://reddit.com', null)).toBeNull()
  })
})

describe('meaningful question selection', () => {
  const now = new Date('2026-10-15T12:00:00Z')
  it('opens the selected topic instead of a different weak topic', () => {
    const cards = [card('spanish', 'Spanish'), card('french', 'French')]
    expect(
      selectInterruptCards(cards, 'quick', 'french', 'practice', now).map(
        (item) => item.id,
      ),
    ).toEqual(['french'])
  })
  it('respects due dates for intercepted visits, while permitting intentional extra practice', () => {
    const cards = [
      card('future', 'French', { nextReviewAt: '2026-10-20T00:00:00Z' }),
    ]
    expect(
      selectInterruptCards(cards, 'quick', null, 'extension', now),
    ).toEqual([])
    expect(
      selectInterruptCards(cards, 'quick', 'French', 'practice', now),
    ).toHaveLength(1)
  })
  it('uses one or three questions according to the chosen mode and excludes archived material', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      card(`${i}`, 'French', { latestConfidence: 'not_confident' }),
    )
    cards[0].isArchived = true
    expect(
      selectInterruptCards(cards, 'quick', null, 'practice', now),
    ).toHaveLength(1)
    expect(
      selectInterruptCards(cards, 'focus', null, 'practice', now),
    ).toHaveLength(3)
    expect(
      selectInterruptCards(cards, 'smart', null, 'practice', now),
    ).toHaveLength(3)
    expect(
      selectInterruptCards(cards, 'focus', null, 'practice', now).some(
        (item) => item.isArchived,
      ),
    ).toBe(false)
  })
})
