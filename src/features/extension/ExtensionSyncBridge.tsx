import { useEffect } from 'react'
import { useBlockedDomains } from '../blocked-domains/useBlockedDomains'
import { subscribeToExtensionSyncRequests, syncExtensionRules } from './extensionBridge'

export function ExtensionSyncBridge() {
  const { domains, isLoading } = useBlockedDomains()
  const activeDomains = domains.filter((item) => item.isActive).map((item) => item.domain)

  useEffect(() => {
    if (isLoading) {
      return
    }

    syncExtensionRules(activeDomains)
  }, [activeDomains, isLoading])

  useEffect(() => {
    return subscribeToExtensionSyncRequests(() => {
      syncExtensionRules(activeDomains)
    })
  }, [activeDomains])

  return null
}
