import type { LearningBrief, LearningCard, TutorRecommendation, TutorTraceItem } from '../../types/domain'
import { buildTopicMastery } from '../mastery/topicMastery'
import { sortCardsForReview } from '../cards/scheduling'

export function buildDemoTutorResult(cards: LearningCard[], briefs: LearningBrief[]) {
  const mastery = buildTopicMastery(cards)
  const dueCards = sortCardsForReview(cards).slice(0, 12)
  const weakReviews = cards.filter(card => card.latestConfidence === 'semi' || card.latestConfidence === 'not_confident')
    .sort((left, right) => (right.lastReviewedAt ?? '').localeCompare(left.lastReviewedAt ?? '')).slice(0, 10)
  const trace: TutorTraceItem[] = [
    { sequence: 1, tool: 'get_topic_mastery', status: 'success', latencyMs: 0 },
    { sequence: 2, tool: 'get_due_cards', status: 'success', latencyMs: 0 },
    { sequence: 3, tool: 'get_recent_weaknesses', status: 'success', latencyMs: 0 },
    { sequence: 4, tool: 'get_recent_learning_briefs', status: 'success', latencyMs: 0 },
  ]
  const weakest = mastery[0]
  const fallbackTopic = dueCards[0]?.generationTopic?.trim() || 'your learning cards'
  const focusTopic = weakest?.topic ?? fallbackTopic
  const recentBrief = briefs.find(brief => brief.topic.trim().toLowerCase() === focusTopic.toLowerCase())
  let reason: string
  let confidence: TutorRecommendation['confidence']
  if (weakest) {
    reason = `${focusTopic} has your lowest reported confidence at ${weakest.masteryScore}% across ${weakest.attempts} review${weakest.attempts === 1 ? '' : 's'}.`
    confidence = weakest.attempts >= 3 ? 'high' : 'medium'
  } else if (dueCards.length) {
    reason = `You have ${dueCards.length} active card${dueCards.length === 1 ? '' : 's'} ready for review, but not enough topic history for a mastery signal yet.`
    confidence = 'medium'
  } else {
    reason = 'There are no active cards or topic reviews yet, so this is a starter session rather than a personalised recommendation.'
    confidence = 'low'
  }
  const actions = dueCards.length
    ? [`Review up to ${Math.min(5, dueCards.length)} due cards for ${focusTopic}.`,
      weakReviews.length ? 'Retry one card you rated semi-confident or not confident.' : 'Rate each answer honestly to build a useful confidence signal.',
      recentBrief ? `Skim “${recentBrief.title}” and note one idea to revisit.` : 'Write one sentence explaining the hardest answer in your own words.']
    : ['Create or generate a small topic pack.', 'Review the first three cards and rate your confidence.', 'Return after those reviews for a data-informed recommendation.']
  return { recommendation: { headline: weakest ? `Strengthen ${focusTopic}` : 'Build your first learning signal',
    focusTopic, reason, actions, estimatedMinutes: 10, confidence }, trace }
}
