import { useEffect, useState } from 'react'
import {
  bulkCreateLearningCards,
  createLearningCard,
  deleteLearningCard,
  getNextLearningCard,
  listLearningCards,
  setLearningCardArchivedState,
  updateLearningCard,
} from './cardsRepository'
import { useAuth } from '../auth/useAuth'
import type { LearningCard } from '../../types/domain'

interface SaveLearningCardInput {
  question: string
  answer: string
  source?: 'manual' | 'ai'
  generationTopic?: string | null
  isUserEdited?: boolean
}

export function useLearningCards() {
  const { user } = useAuth()
  const [cards, setCards] = useState<LearningCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCards() {
      if (!user) {
        setCards([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextCards = await listLearningCards(user.id)

        if (!cancelled) {
          setCards(nextCards)
        }
      } catch (nextError) {
        if (!cancelled) {
          const message =
            nextError instanceof Error ? nextError.message : 'Unable to load learning cards.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCards()

    return () => {
      cancelled = true
    }
  }, [user])

  return {
    cards,
    error,
    isLoading,
    async createCard(input: SaveLearningCardInput) {
      if (!user) {
        throw new Error('You must be signed in to create cards.')
      }

      const created = await createLearningCard(user.id, input)
      setCards((current) => [created, ...current])
      return created
    },
    async updateCard(cardId: string, input: SaveLearningCardInput) {
      if (!user) {
        throw new Error('You must be signed in to edit cards.')
      }

      const updated = await updateLearningCard(user.id, cardId, input)

      if (!updated) {
        throw new Error('That card could not be found.')
      }

      setCards((current) => current.map((item) => (item.id === cardId ? updated : item)))
      return updated
    },
    async archiveCard(cardId: string, isArchived: boolean) {
      if (!user) {
        throw new Error('You must be signed in to change cards.')
      }

      const updated = await setLearningCardArchivedState(user.id, cardId, isArchived)

      if (!updated) {
        throw new Error('That card could not be found.')
      }

      setCards((current) => current.map((item) => (item.id === cardId ? updated : item)))
      return updated
    },
    async removeCard(cardId: string) {
      if (!user) {
        throw new Error('You must be signed in to delete cards.')
      }

      await deleteLearningCard(user.id, cardId)
      setCards((current) => current.filter((item) => item.id !== cardId))
    },
    async getNextCard() {
      if (!user) {
        return null
      }

      return getNextLearningCard(user.id)
    },
    async addGeneratedCards(inputs: SaveLearningCardInput[]) {
      if (!user) {
        throw new Error('You must be signed in to add generated cards.')
      }

      const created = await bulkCreateLearningCards(user.id, inputs)
      setCards((current) => [...created, ...current])
      return created
    },
  }
}
