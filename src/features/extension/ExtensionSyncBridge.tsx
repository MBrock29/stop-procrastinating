import { useEffect, useMemo } from 'react'
import { useBlockedDomains } from '../blocked-domains/useBlockedDomains'
import { env } from '../../lib/env'
import { subscribeToExtensionSyncRequests, syncExtensionRules } from './extensionBridge'
import { useExtensionStatus } from './useExtensionStatus'

function normalizeDomains(domains: string[]) {
  return [...domains].sort().join('|')
}

export function ExtensionSyncBridge() {
  const { domains, isLoading } = useBlockedDomains()
  const extensionStatus = useExtensionStatus()
  const activeDomains = domains.filter((item) => item.isActive).map((item) => item.domain)
  const desiredDomainSignature = useMemo(() => normalizeDomains(activeDomains), [activeDomains])
  const syncedDomainSignature = useMemo(
    () => normalizeDomains(extensionStatus.details?.blockedDomains ?? []),
    [extensionStatus.details?.blockedDomains],
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    syncExtensionRules(activeDomains)
  }, [activeDomains, isLoading])

  useEffect(() => {
    if (isLoading || extensionStatus.status !== 'connected') {
      return
    }

    const appUrlMatches = extensionStatus.details?.appBaseUrl === env.appUrl
    const domainsMatch = syncedDomainSignature === desiredDomainSignature

    if (appUrlMatches && domainsMatch) {
      return
    }

    syncExtensionRules(activeDomains)
  }, [
    activeDomains,
    desiredDomainSignature,
    extensionStatus.details?.appBaseUrl,
    extensionStatus.status,
    isLoading,
    syncedDomainSignature,
  ])

  useEffect(() => {
    return subscribeToExtensionSyncRequests(() => {
      syncExtensionRules(activeDomains)
    })
  }, [activeDomains])

  return null
}
