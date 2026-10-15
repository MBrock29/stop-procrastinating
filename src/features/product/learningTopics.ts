import type { LearningCard } from '../../types/domain'
import { isCardDue } from '../cards/scheduling'

export function buildLearningTopics(cards: LearningCard[], now = new Date()) {
  const topics = new Map<
    string,
    {
      title: string
      cards: LearningCard[]
      due: number
      reviews: number
      confidence: number | null
    }
  >()
  for (const card of cards.filter((item) => !item.isArchived)) {
    const title = card.generationTopic?.trim() || 'My own questions'
    const key = title.toLowerCase()
    const topic = topics.get(key) ?? {
      title,
      cards: [],
      due: 0,
      reviews: 0,
      confidence: null,
    }
    topic.cards.push(card)
    if (isCardDue(card, now)) topic.due++
    topics.set(key, topic)
  }
  for (const topic of topics.values()) {
    const totals = topic.cards.reduce(
      (sum, card) => ({
        reviews:
          sum.reviews +
          card.knowCount +
          card.semiCount +
          card.notConfidentCount,
        weighted: sum.weighted + card.knowCount + card.semiCount * 0.5,
      }),
      { reviews: 0, weighted: 0 },
    )
    topic.reviews = totals.reviews
    topic.confidence = totals.reviews
      ? Math.round((totals.weighted / totals.reviews) * 100)
      : null
  }
  return [...topics.values()].sort(
    (a, b) => b.due - a.due || a.title.localeCompare(b.title),
  )
}

export function topicPracticeUrl(topic: string, mode = 'quick') {
  return `/interrupt?${new URLSearchParams({ source: 'practice', mode, topic })}`
}
