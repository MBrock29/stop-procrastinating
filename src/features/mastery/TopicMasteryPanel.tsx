import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { listTopicMastery } from './masteryRepository'
import type { TopicMastery } from './topicMastery'

export function TopicMasteryPanel() {
  const { user, mode } = useAuth()
  const [topics, setTopics] = useState<TopicMastery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setTopics([])
    setError(null)
    setLoading(true)
    if (!user) { setLoading(false); return }
    void listTopicMastery(user.id).then(data => {
      if (!cancelled) setTopics(data)
    }).catch(() => {
      if (!cancelled) setError('Unable to load topic confidence. Please reload to try again.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])
  return <section className="soft-card mt-8 p-5" aria-labelledby="topic-mastery-title">
    <h2 id="topic-mastery-title" className="text-lg font-bold">Topic confidence</h2>
    <p className="muted-copy mt-2 text-sm">Based on your review ratings: know = 1, semi-confident = 0.5, not confident = 0.
      This measures reported confidence, not correctness.{mode === 'demo' ? ' Demo results come from your saved local cards.' : ''}</p>
    {loading ? <p role="status" className="mt-4">Loading topic confidence…</p> :
      error ? <p role="alert" className="mt-4">{error}</p> :
      topics.length === 0 ? <p className="muted-copy mt-4">Review cards from a topic pack to start tracking confidence.</p> :
      <ul className="mt-4 space-y-3">{topics.map(topic => <li key={topic.topic} className="soft-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{topic.topic}</strong>
          <span>{topic.masteryScore}% · {topic.attempts} reviews</span></div>
        {topic.nextRecommendedReviewAt && <p className="muted-copy mt-2 text-sm">Suggested review: {new Date(topic.nextRecommendedReviewAt).toLocaleDateString()}</p>}
      </li>)}</ul>}
  </section>
}
