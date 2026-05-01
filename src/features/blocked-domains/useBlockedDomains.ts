import { useEffect, useState } from 'react'
import {
  createBlockedDomain,
  deleteBlockedDomain,
  listBlockedDomains,
  updateBlockedDomainState,
} from './blockedDomainsRepository'
import { useAuth } from '../auth/useAuth'
import { normalizeDomainInput } from '../../utils/domains'
import type { BlockedDomain } from '../../types/domain'

export function useBlockedDomains() {
  const { user } = useAuth()
  const [domains, setDomains] = useState<BlockedDomain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDomains() {
      if (!user) {
        setDomains([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const nextDomains = await listBlockedDomains(user.id)

        if (!cancelled) {
          setDomains(nextDomains)
        }
      } catch (nextError) {
        if (!cancelled) {
          const message =
            nextError instanceof Error
              ? nextError.message
              : 'Unable to load blocked domains.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDomains()

    return () => {
      cancelled = true
    }
  }, [user])

  return {
    domains,
    error,
    isLoading,
    async addDomain(rawInput: string) {
      if (!user) {
        throw new Error('You must be signed in to add blocked domains.')
      }

      const normalizedDomain = normalizeDomainInput(rawInput)
      const alreadyExists = domains.some((item) => item.domain === normalizedDomain)

      if (alreadyExists) {
        throw new Error('That domain is already on your blocked list.')
      }

      const created = await createBlockedDomain(user.id, normalizedDomain)
      setDomains((current) => [created, ...current])
      return created
    },
    async toggleDomain(domainId: string, isActive: boolean) {
      if (!user) {
        throw new Error('You must be signed in to update blocked domains.')
      }

      const updated = await updateBlockedDomainState(user.id, domainId, isActive)

      if (!updated) {
        return
      }

      setDomains((current) =>
        current.map((item) => (item.id === domainId ? updated : item)),
      )
    },
    async removeDomain(domainId: string) {
      if (!user) {
        throw new Error('You must be signed in to remove blocked domains.')
      }

      await deleteBlockedDomain(user.id, domainId)
      setDomains((current) => current.filter((item) => item.id !== domainId))
    },
  }
}
