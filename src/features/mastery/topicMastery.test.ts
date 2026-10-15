import { describe, expect, it } from 'vitest'
import { buildTopicMastery, masteryScore } from './topicMastery'
import type { LearningCard } from '../../types/domain'

describe('topic mastery', () => {
  it('weights confidence transparently and handles no attempts', () => {
    expect(masteryScore(0, 0, 0)).toBe(0)
    expect(masteryScore(1, 2, 1)).toBe(50)
    expect(masteryScore(4, 0, 0)).toBe(100)
  })
  it('combines topic casing and derives a recommendation from the latest review', () => {
    const cards = [
      { generationTopic: ' React ', knowCount: 1, semiCount: 0, notConfidentCount: 0, lastReviewedAt: '2026-10-10T00:00:00.000Z' },
      { generationTopic: 'react', knowCount: 0, semiCount: 0, notConfidentCount: 1, lastReviewedAt: '2026-10-15T00:00:00.000Z' },
    ] as LearningCard[]
    expect(buildTopicMastery(cards)).toEqual([{ topic: 'react', attempts: 2, knowCount: 1,
      semiCount: 0, notConfidentCount: 1, masteryScore: 50,
      lastReviewedAt: '2026-10-15T00:00:00.000Z', nextRecommendedReviewAt: '2026-10-18T00:00:00.000Z' }])
  })
})
