import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { canAccessPremium, resolveEffectivePlanTier } from './byokVisibility'
import { TIER_POLICIES } from './constants'
import {
  deleteStoredByokCredential,
  getAiAccessSettings,
  readCachedAiAccessSettings,
  getStoredByokCredentialStatus,
  listAiGenerationEvents,
  saveStoredByokCredential,
  saveAiAccessSettings,
} from './aiAccessRepository'
import {
  clearLocalByokCredentials,
  readLocalByokCredentials,
  writeLocalByokCredentials,
  type LocalByokCredentials,
} from './localByok'
import type {
  AiAccessSettings,
  AiGenerationEvent,
  ByokCredentialStatus,
  PlanTier,
  SupportedAiModel,
} from '../../types/domain'

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
  preferredModel: 'gpt-4.1-mini',
  showContinueToSiteButton: true,
  premiumInterruptMode: 'cards',
  redirectBackMode: 'manual',
  redirectBackCardCount: 1,
  createdAt: '',
  updatedAt: '',
}

function buildUsageSnapshot(events: AiGenerationEvent[], planTier: PlanTier): UsageSnapshot {
  const successful = events.filter((event) => event.status === 'success')
  const successfulForPlan = successful.filter((event) => event.planTier === planTier)

  return {
    currentMonthPacksUsed: successfulForPlan.length,
    currentMonthCardsGenerated: successfulForPlan.reduce((sum, event) => sum + event.cardCount, 0),
    currentMonthPlatformCostUsd: Number(
      successfulForPlan
        .filter((event) => !event.usedByok)
        .reduce((sum, event) => sum + (event.estimatedCostUsd ?? 0), 0)
        .toFixed(6),
    ),
    currentMonthByokCostUsd: Number(
      successfulForPlan
        .filter((event) => event.usedByok)
        .reduce((sum, event) => sum + (event.estimatedCostUsd ?? 0), 0)
        .toFixed(6),
    ),
    lastGeneratedAt: successfulForPlan[0]?.createdAt ?? null,
  }
}

function applyEffectivePlan(settings: AiAccessSettings, email?: string | null): AiAccessSettings {
  const effectivePlanTier = resolveEffectivePlanTier(settings.planTier, email)

  if (effectivePlanTier === settings.planTier) {
    return settings
  }

  return {
    ...settings,
    planTier: effectivePlanTier,
  }
}

export function useAiAccess() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AiAccessSettings>(() => {
    if (!user) {
      return fallbackSettings
    }

    return readCachedAiAccessSettings(user.id) ?? {
      ...fallbackSettings,
      userId: user.id,
    }
  })
  const [events, setEvents] = useState<AiGenerationEvent[]>([])
  const [byokCredentialStatus, setByokCredentialStatus] = useState<ByokCredentialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const effectiveSettings = useMemo(
    () => applyEffectivePlan(settings, user?.email),
    [settings, user?.email],
  )

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings(fallbackSettings)
      setEvents([])
      setByokCredentialStatus(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const cachedSettings = readCachedAiAccessSettings(user.id)
      if (cachedSettings) {
        setSettings(cachedSettings)
      }

      const browserClient = getSupabaseBrowserClient()
      const localByokCredential = browserClient ? null : readLocalByokCredentials(user.id)
      const [nextSettings, nextEvents] = await Promise.all([
        getAiAccessSettings(user.id),
        listAiGenerationEvents(user.id),
      ])
      let nextByokCredentialStatus: ByokCredentialStatus | null = null

      if (browserClient) {
        try {
          nextByokCredentialStatus = await getStoredByokCredentialStatus()
        } catch (credentialError) {
          console.error('Unable to load BYOK credential status:', credentialError)
        }
      } else {
        nextByokCredentialStatus = localByokCredential
          ? {
              provider: localByokCredential.provider,
              lastFour: localByokCredential.apiKey.slice(-4),
              updatedAt: new Date().toISOString(),
            }
          : null
      }

      setSettings(nextSettings)
      setEvents(nextEvents)
      setByokCredentialStatus(nextByokCredentialStatus)
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

  const usage = useMemo(
    () => buildUsageSnapshot(events, effectiveSettings.planTier),
    [events, effectiveSettings.planTier],
  )
  const tierPolicy = TIER_POLICIES[effectiveSettings.planTier]

  return {
    settings: effectiveSettings,
    events,
    usage,
    tierPolicy,
    byokCredentialStatus,
    error,
    isLoading,
    refresh,
    async setPlanTier(planTier: PlanTier) {
      if (!user) {
        throw new Error('You must be signed in to change plans.')
      }

      if (planTier === 'premium' && !canAccessPremium(user.email)) {
        throw new Error('Premium is not available on this account yet.')
      }

      const nextSettings = await saveAiAccessSettings(user.id, {
        planTier,
        byokProvider: effectiveSettings.byokProvider,
        preferredModel: effectiveSettings.preferredModel,
        showContinueToSiteButton: effectiveSettings.showContinueToSiteButton,
        premiumInterruptMode: effectiveSettings.premiumInterruptMode,
        redirectBackMode: effectiveSettings.redirectBackMode,
        redirectBackCardCount: effectiveSettings.redirectBackCardCount,
      })
      setSettings(nextSettings)
      return nextSettings
    },
    async updateSettings(
      input: Partial<{
        planTier: PlanTier
        byokProvider: AiAccessSettings['byokProvider']
        preferredModel: SupportedAiModel
        showContinueToSiteButton: boolean
        premiumInterruptMode: AiAccessSettings['premiumInterruptMode']
        redirectBackMode: AiAccessSettings['redirectBackMode']
        redirectBackCardCount: number
      }>,
    ) {
      if (!user) {
        throw new Error('You must be signed in to update AI settings.')
      }

      if (
        (input.planTier ?? effectiveSettings.planTier) === 'premium' &&
        !canAccessPremium(user.email)
      ) {
        throw new Error('Premium is not available on this account yet.')
      }

      const nextSettings = await saveAiAccessSettings(user.id, {
        planTier: input.planTier ?? effectiveSettings.planTier,
        byokProvider: input.byokProvider ?? effectiveSettings.byokProvider,
        preferredModel: input.preferredModel ?? effectiveSettings.preferredModel,
        showContinueToSiteButton:
          input.showContinueToSiteButton ?? effectiveSettings.showContinueToSiteButton,
        premiumInterruptMode:
          input.premiumInterruptMode ?? effectiveSettings.premiumInterruptMode,
        redirectBackMode: input.redirectBackMode ?? effectiveSettings.redirectBackMode,
        redirectBackCardCount:
          input.redirectBackCardCount ?? effectiveSettings.redirectBackCardCount,
      })
      setSettings(nextSettings)
      return nextSettings
    },
    saveByokCredentials(credentials: LocalByokCredentials) {
      if (!user) {
        throw new Error('You must be signed in to save BYOK credentials.')
      }

      const browserClient = getSupabaseBrowserClient()

      if (!browserClient) {
        writeLocalByokCredentials(user.id, credentials)
        setByokCredentialStatus({
          provider: credentials.provider,
          lastFour: credentials.apiKey.slice(-4),
          updatedAt: new Date().toISOString(),
        })
        return
      }

      return saveStoredByokCredential(credentials).then((nextStatus) => {
        setByokCredentialStatus(nextStatus)
        return nextStatus
      })
    },
    clearByokCredentials() {
      if (!user) {
        return
      }

      const browserClient = getSupabaseBrowserClient()

      if (!browserClient) {
        clearLocalByokCredentials(user.id)
        setByokCredentialStatus(null)
        return
      }

      return deleteStoredByokCredential().then(() => {
        setByokCredentialStatus(null)
      })
    },
  }
}
