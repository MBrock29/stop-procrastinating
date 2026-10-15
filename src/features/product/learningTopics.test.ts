import { expect, it } from 'vitest'
import type { LearningCard } from '../../types/domain'
import { buildLearningTopics, topicPracticeUrl } from './learningTopics'

it('safely encodes a topic for practice', () => {
  const params = new URL(
    topicPracticeUrl('French & travel?'),
    'https://example.com',
  ).searchParams
  expect(params.get('topic')).toBe('French & travel?')
  expect(params.get('source')).toBe('practice')
})

it('groups active material by normalized topic and does not invent confidence before reviews', () => {
  const base = {
    isArchived: false,
    nextReviewAt: null,
    knowCount: 0,
    semiCount: 0,
    notConfidentCount: 0,
  }
  const cards = [
    { ...base, id: '1', generationTopic: 'French' },
    { ...base, id: '2', generationTopic: ' french ' },
    { ...base, id: '3', generationTopic: 'German', knowCount: 2, semiCount: 2 },
    { ...base, id: '4', generationTopic: 'Archived', isArchived: true },
  ] as LearningCard[]
  const topics = buildLearningTopics(cards)
  expect(topics).toHaveLength(2)
  expect(topics[0]).toMatchObject({
    title: 'French',
    due: 2,
    reviews: 0,
    confidence: null,
  })
  expect(topics[1]).toMatchObject({
    title: 'German',
    reviews: 4,
    confidence: 75,
  })
})
