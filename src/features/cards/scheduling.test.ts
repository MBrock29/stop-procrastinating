import { describe, expect, it } from 'vitest'
import { applyConfidenceToCard, getNextReviewAt, selectNextDueCard } from './scheduling'
import type { LearningCard } from '../../types/domain'

function createCard(overrides: Partial<LearningCard> = {}): LearningCard {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    userId: 'user-1',
    question: 'Question',
    answer: 'Answer',
    source: 'manual',
    generationTopic: null,
    isUserEdited: false,
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

describe('getNextReviewAt', () => {
  it('schedules know farther out than semi and not confident', () => {
    const base = new Date('2026-05-01T10:00:00.000Z')
    const know = new Date(getNextReviewAt('know', base)).getTime()
    const semi = new Date(getNextReviewAt('semi', base)).getTime()
    const notConfident = new Date(getNextReviewAt('not_confident', base)).getTime()

    expect(know).toBeGreaterThan(semi)
    expect(semi).toBeGreaterThan(notConfident)
  })
})

describe('applyConfidenceToCard', () => {
  it('increments the matching confidence bucket and schedules the next review', () => {
    const card = createCard()
    const updated = applyConfidenceToCard(card, 'semi', new Date('2026-05-01T10:00:00.000Z'))

    expect(updated.semiCount).toBe(1)
    expect(updated.knowCount).toBe(0)
    expect(updated.notConfidentCount).toBe(0)
    expect(updated.nextReviewAt).toBe('2026-05-06T10:00:00.000Z')
  })
})

describe('selectNextDueCard', () => {
  it('returns a due card before later cards', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const due = createCard({ id: 'due', nextReviewAt: '2026-05-09T10:00:00.000Z' })
    const later = createCard({ id: 'later', nextReviewAt: '2026-05-12T10:00:00.000Z' })

    expect(selectNextDueCard([later, due], now)?.id).toBe('due')
  })

  it('falls back to the least recently reviewed active card when nothing is due', () => {
    const now = new Date('2026-05-10T10:00:00.000Z')
    const older = createCard({
      id: 'older',
      lastReviewedAt: '2026-05-01T10:00:00.000Z',
      nextReviewAt: '2026-05-12T10:00:00.000Z',
    })
    const newer = createCard({
      id: 'newer',
      lastReviewedAt: '2026-05-05T10:00:00.000Z',
      nextReviewAt: '2026-05-13T10:00:00.000Z',
    })

    expect(selectNextDueCard([newer, older], now)?.id).toBe('older')
  })
})
