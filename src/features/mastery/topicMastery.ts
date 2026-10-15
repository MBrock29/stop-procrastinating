import type { LearningCard } from '../../types/domain'

export interface TopicMastery {
  topic: string
  attempts: number
  knowCount: number
  semiCount: number
  notConfidentCount: number
  masteryScore: number
  lastReviewedAt: string | null
  nextRecommendedReviewAt: string | null
}

// Confidence is a self-report signal, not an assessment of correctness.
export function masteryScore(know: number, semi: number, notConfident: number) {
  const attempts = know + semi + notConfident
  return attempts ? Math.round((know + semi * 0.5) / attempts * 10_000) / 100 : 0
}

export function buildTopicMastery(cards: LearningCard[]): TopicMastery[] {
  const grouped = new Map<string, TopicMastery>()
  for (const card of cards) {
    const topic = card.generationTopic?.trim().toLowerCase()
    if (!topic) continue
    const state = grouped.get(topic) ?? { topic, attempts: 0, knowCount: 0, semiCount: 0,
      notConfidentCount: 0, masteryScore: 0, lastReviewedAt: null, nextRecommendedReviewAt: null }
    state.knowCount += card.knowCount
    state.semiCount += card.semiCount
    state.notConfidentCount += card.notConfidentCount
    if (card.lastReviewedAt && (!state.lastReviewedAt || card.lastReviewedAt > state.lastReviewedAt)) {
      state.lastReviewedAt = card.lastReviewedAt
    }
    state.attempts = state.knowCount + state.semiCount + state.notConfidentCount
    state.masteryScore = masteryScore(state.knowCount, state.semiCount, state.notConfidentCount)
    if (state.lastReviewedAt) {
      const days = state.masteryScore >= 80 ? 7 : state.masteryScore >= 50 ? 3 : 1
      state.nextRecommendedReviewAt = new Date(Date.parse(state.lastReviewedAt) + days * 86_400_000).toISOString()
    }
    grouped.set(topic, state)
  }
  return [...grouped.values()].sort((left, right) => left.masteryScore - right.masteryScore)
}
