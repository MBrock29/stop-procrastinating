import { useEffect, useMemo } from 'react'
import { useBlockedDomains } from '../blocked-domains/useBlockedDomains'
import { env } from '../../lib/env'
import {
  subscribeToExtensionSyncRequests,
  syncExtensionRules,
} from './extensionBridge'
import { useExtensionStatus } from './useExtensionStatus'

function normalizeDomains(domains: string[]) {
  return [...domains].sort().join('|')
}

function toRules(domains: ReturnType<typeof useBlockedDomains>['domains']) {
  return domains
    .filter((item) => item.isActive)
    .map((item) => ({
      domain: item.domain,
      scheduleDays: item.scheduleDays,
      scheduleAllDay: item.scheduleAllDay,
      scheduleStart: item.scheduleStart,
      scheduleEnd: item.scheduleEnd,
      interventionMode: item.interventionMode,
      pausedUntil: item.pausedUntil,
    }))
}

export function ExtensionSyncBridge() {
  const { domains, isLoading } = useBlockedDomains()
  const extensionStatus = useExtensionStatus()
  const activeDomains = useMemo(
    () => domains.filter((item) => item.isActive).map((item) => item.domain),
    [domains],
  )
  const activeRules = useMemo(() => toRules(domains), [domains])
  const desiredRuleSignature = JSON.stringify(activeRules)
  const desiredDomainSignature = useMemo(
    () => normalizeDomains(activeDomains),
    [activeDomains],
  )
  const syncedDomainSignature = useMemo(
    () => normalizeDomains(extensionStatus.details?.blockedDomains ?? []),
    [extensionStatus.details?.blockedDomains],
  )
  const syncedRuleSignature = useMemo(
    () => JSON.stringify(extensionStatus.details?.rules ?? []),
    [extensionStatus.details?.rules],
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    syncExtensionRules(activeDomains, activeRules)
  }, [activeDomains, activeRules, isLoading])

  useEffect(() => {
    if (isLoading || extensionStatus.status !== 'connected') {
      return
    }

    const appUrlMatches = extensionStatus.details?.appBaseUrl === env.appUrl
    const domainsMatch =
      syncedDomainSignature === desiredDomainSignature &&
      syncedRuleSignature === desiredRuleSignature

    if (appUrlMatches && domainsMatch) {
      return
    }

    syncExtensionRules(activeDomains, activeRules)
  }, [
    activeDomains,
    activeRules,
    desiredDomainSignature,
    desiredRuleSignature,
    extensionStatus.details?.appBaseUrl,
    extensionStatus.status,
    isLoading,
    syncedDomainSignature,
    syncedRuleSignature,
  ])

  useEffect(() => {
    return subscribeToExtensionSyncRequests(() => {
      syncExtensionRules(activeDomains, activeRules)
    })
  }, [activeDomains, activeRules])

  return null
}
