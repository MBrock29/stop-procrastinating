import { describe, expect, it } from 'vitest'
import type { LearningCard } from '../../types/domain'
import { buildDemoTutorResult } from './demoTutor'

describe('demo tutor', () => {
  it('chooses the weakest real topic and discloses sparse evidence', () => {
    const cards = [
      { generationTopic: 'React', knowCount: 0, semiCount: 0, notConfidentCount: 1,
        latestConfidence: 'not_confident', isArchived: false, createdAt: '2026-10-01', lastReviewedAt: '2026-10-10' },
      { generationTopic: 'SQL', knowCount: 3, semiCount: 0, notConfidentCount: 0,
        latestConfidence: 'know', isArchived: false, createdAt: '2026-10-01', lastReviewedAt: '2026-10-11' },
    ] as LearningCard[]
    const result = buildDemoTutorResult(cards, [])
    expect(result.recommendation.focusTopic).toBe('react')
    expect(result.recommendation.confidence).toBe('medium')
    expect(result.trace).toHaveLength(4)
  })
  it('does not invent personalised evidence without cards', () => {
    const result = buildDemoTutorResult([], [])
    expect(result.recommendation.confidence).toBe('low')
    expect(result.recommendation.reason).toContain('no active cards')
  })
})
