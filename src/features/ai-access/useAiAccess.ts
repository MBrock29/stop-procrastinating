import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { TIER_POLICIES } from './constants'
import {
  getAiAccessSettings,
  listAiGenerationEvents,
  saveAiAccessSettings,
} from './aiAccessRepository'
import {
  clearLocalByokCredentials,
  readLocalByokCredentials,
  writeLocalByokCredentials,
  type LocalByokCredentials,
} from './localByok'
import type { AiAccessSettings, AiGenerationEvent, PlanTier, SupportedAiModel } from '../../types/domain'

interface UsageSnapshot {
  currentMonthPacksUsed: number
  currentMonthCardsGenerated: number
  currentMonthPlatformCostUsd: number
  currentMonthByokCostUsd: number
  lastGeneratedAt: string | null
}

const fallbackSettings: AiAccessSettings = {
  userId: '',
  planTier: 'free',
  byokProvider: 'openrouter',
  preferredModel: 'gpt-4o-mini',
  createdAt: '',
  updatedAt: '',
}

function buildUsageSnapshot(events: AiGenerationEvent[]): UsageSnapshot {
  const successful = events.filter((event) => event.status === 'success')

  return {
    currentMonthPacksUsed: successful.length,
    currentMonthCardsGenerated: successful.reduce((sum, event) => sum + event.cardCount, 0),
    currentMonthPlatformCostUsd: Number(
      successful
        .filter((event) => !event.usedByok)
        .reduce((sum, event) => sum + (event.estimatedCostUsd ?? 0), 0)
        .toFixed(6),
    ),
    currentMonthByokCostUsd: Number(
      successful
        .filter((event) => event.usedByok)
        .reduce((sum, event) => sum + (event.estimatedCostUsd ?? 0), 0)
        .toFixed(6),
    ),
    lastGeneratedAt: successful[0]?.createdAt ?? null,
  }
}

export function useAiAccess() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AiAccessSettings>(fallbackSettings)
  const [events, setEvents] = useState<AiGenerationEvent[]>([])
  const [localByokCredentials, setLocalByokCredentials] = useState<LocalByokCredentials | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings(fallbackSettings)
      setEvents([])
      setLocalByokCredentials(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [nextSettings, nextEvents] = await Promise.all([
        getAiAccessSettings(user.id),
        listAiGenerationEvents(user.id),
      ])

      setSettings(nextSettings)
      setEvents(nextEvents)
      setLocalByokCredentials(readLocalByokCredentials(user.id))
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to load plan settings.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const usage = useMemo(() => buildUsageSnapshot(events), [events])
  const tierPolicy = TIER_POLICIES[settings.planTier]

  return {
    settings,
    events,
    usage,
    tierPolicy,
    localByokCredentials,
    error,
    isLoading,
    refresh,
    async setPlanTier(planTier: PlanTier) {
      if (!user) {
        throw new Error('You must be signed in to change plans.')
      }

      const nextSettings = await saveAiAccessSettings(user.id, {
        planTier,
        byokProvider: settings.byokProvider,
        preferredModel: settings.preferredModel,
      })
      setSettings(nextSettings)
      return nextSettings
    },
    async updateSettings(input: {
      planTier: PlanTier
      byokProvider: AiAccessSettings['byokProvider']
      preferredModel: SupportedAiModel
    }) {
      if (!user) {
        throw new Error('You must be signed in to update AI settings.')
      }

      const nextSettings = await saveAiAccessSettings(user.id, input)
      setSettings(nextSettings)
      return nextSettings
    },
    saveByokCredentials(credentials: LocalByokCredentials) {
      if (!user) {
        throw new Error('You must be signed in to save BYOK credentials.')
      }

      writeLocalByokCredentials(user.id, credentials)
      setLocalByokCredentials(credentials)
    },
    clearByokCredentials() {
      if (!user) {
        return
      }

      clearLocalByokCredentials(user.id)
      setLocalByokCredentials(null)
    },
  }
}
