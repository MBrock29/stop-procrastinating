import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  createLearningBrief,
  deleteLearningBrief,
  listLearningBriefs,
} from './briefsRepository'
import type { LearningBrief } from '../../types/domain'

export function useLearningBriefs() {
  const { user } = useAuth()
  const [briefs, setBriefs] = useState<LearningBrief[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadBriefs() {
      if (!user) {
        setBriefs([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextBriefs = await listLearningBriefs(user.id)
        if (!cancelled) {
          setBriefs(nextBriefs)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Unable to load learning briefs.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBriefs()

    return () => {
      cancelled = true
    }
  }, [user])

  return {
    briefs,
    isLoading,
    error,
    async addBrief(
      input: Pick<
        LearningBrief,
        'topic' | 'generationBatchId' | 'title' | 'content' | 'kind'
      >,
    ) {
      if (!user) {
        throw new Error('You must be signed in to save briefs.')
      }

      const created = await createLearningBrief(user.id, input)
      setBriefs((current) => [created, ...current])
      return created
    },
    async removeBrief(briefId: string) {
      if (!user) {
        throw new Error('You must be signed in to remove briefs.')
      }

      await deleteLearningBrief(user.id, briefId)
      setBriefs((current) => current.filter((brief) => brief.id !== briefId))
    },
  }
}
