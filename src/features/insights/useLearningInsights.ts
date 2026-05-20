import { useEffect, useMemo, useState } from 'react'
import type { CardReview, LearningCard } from '../../types/domain'
import { useAuth } from '../auth/useAuth'
import { listCardReviews } from '../interrupts/interruptRepository'

interface TopicInsight {
  topic: string
  totalCards: number
  knowCount: number
  semiCount: number
  notConfidentCount: number
  score: number
}

interface DailyReviewSnapshot {
  date: string
  label: string
  total: number
  know: number
  semi: number
  notConfident: number
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildDailySnapshots(reviews: CardReview[], days = 7): DailyReviewSnapshot[] {
  const now = new Date()
  const snapshots: DailyReviewSnapshot[] = []

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - index)
    const dayKey = getDayKey(day)

    snapshots.push({
      date: dayKey,
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      total: 0,
      know: 0,
      semi: 0,
      notConfident: 0,
    })
  }

  const snapshotMap = new Map(snapshots.map((item) => [item.date, item]))

  reviews.forEach((review) => {
    const key = review.reviewedAt.slice(0, 10)
    const snapshot = snapshotMap.get(key)

    if (!snapshot) {
      return
    }

    snapshot.total += 1

    if (review.confidence === 'know') {
      snapshot.know += 1
    } else if (review.confidence === 'semi') {
      snapshot.semi += 1
    } else {
      snapshot.notConfident += 1
    }
  })

  return snapshots
}

function buildTopicInsights(cards: LearningCard[]) {
  const grouped = new Map<string, TopicInsight>()

  cards
    .filter((card) => card.generationTopic)
    .forEach((card) => {
      const topic = card.generationTopic ?? 'Untitled topic'
      const existing = grouped.get(topic) ?? {
        topic,
        totalCards: 0,
        knowCount: 0,
        semiCount: 0,
        notConfidentCount: 0,
        score: 0,
      }

      existing.totalCards += 1
      existing.knowCount += card.knowCount
      existing.semiCount += card.semiCount
      existing.notConfidentCount += card.notConfidentCount
      existing.score += card.knowCount * 2 + card.semiCount - card.notConfidentCount * 2

      grouped.set(topic, existing)
    })

  const allTopics = Array.from(grouped.values())
  const weakestTopics = [...allTopics]
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
  const strongestTopics = [...allTopics]
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  return { weakestTopics, strongestTopics }
}

export function useLearningInsights(cards: LearningCard[]) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<CardReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      if (!user) {
        setReviews([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextReviews = await listCardReviews(user.id)

        if (!cancelled) {
          setReviews(nextReviews)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Unable to load learning insights.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadReviews()

    return () => {
      cancelled = true
    }
  }, [user])

  const metrics = useMemo(() => {
    const totalReviews = reviews.length
    const knowReviews = reviews.filter((review) => review.confidence === 'know').length
    const semiReviews = reviews.filter((review) => review.confidence === 'semi').length
    const notConfidentReviews = reviews.filter(
      (review) => review.confidence === 'not_confident',
    ).length
    const archivedCards = cards.filter((card) => card.isArchived).length
    const activeCards = cards.filter((card) => !card.isArchived).length

    return {
      totalCards: cards.length,
      activeCards,
      archivedCards,
      totalReviews,
      knowReviews,
      semiReviews,
      notConfidentReviews,
      confidenceRate:
        totalReviews === 0
          ? 0
          : Math.round((knowReviews / totalReviews) * 100),
    }
  }, [cards, reviews])

  const dailyReviews = useMemo(() => buildDailySnapshots(reviews, 7), [reviews])
  const topicInsights = useMemo(() => buildTopicInsights(cards), [cards])

  return {
    reviews,
    metrics,
    dailyReviews,
    weakestTopics: topicInsights.weakestTopics,
    strongestTopics: topicInsights.strongestTopics,
    isLoading,
    error,
  }
}
