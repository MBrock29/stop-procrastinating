import { getSupabaseBrowserClient } from '../../lib/supabase'
import { listLearningCards } from '../cards/cardsRepository'
import { buildTopicMastery, type TopicMastery } from './topicMastery'

export async function listTopicMastery(userId: string): Promise<TopicMastery[]> {
  const client = getSupabaseBrowserClient()
  if (!client) return buildTopicMastery(await listLearningCards(userId))
  const { data, error } = await client.from('topic_mastery').select('*').eq('user_id', userId).order('mastery_score')
  if (error) throw error
  return (data ?? []).map(row => ({ topic: row.topic, attempts: row.attempts,
    knowCount: row.know_count, semiCount: row.semi_count, notConfidentCount: row.not_confident_count,
    masteryScore: Number(row.mastery_score), lastReviewedAt: row.last_reviewed_at,
    nextRecommendedReviewAt: row.next_recommended_review_at }))
}
