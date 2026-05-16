import { useEffect, useState } from 'react'
import { requestExtensionStatus } from './extensionBridge'
import type { ExtensionStatusPayload } from '../../shared/extension'

interface ExtensionConnectionState {
  status: 'checking' | 'connected' | 'not_connected'
  details: ExtensionStatusPayload | null
  isStale: boolean
  lastCheckedAt: string | null
}

const defaultState: ExtensionConnectionState = {
  status: 'checking',
  details: null,
  isStale: false,
  lastCheckedAt: null,
}

const EXTENSION_STALE_AFTER_MS = 1000 * 60 * 60 * 24

function getIsStale(details: ExtensionStatusPayload | null) {
  if (!details?.lastSyncedAt) {
    return false
  }

  return Date.now() - new Date(details.lastSyncedAt).getTime() > EXTENSION_STALE_AFTER_MS
}

export function useExtensionStatus() {
  const [state, setState] = useState<ExtensionConnectionState>(defaultState)

  useEffect(() => {
    let cancelled = false

    async function readStatus() {
      try {
        const details = await requestExtensionStatus()

        if (!cancelled) {
          setState({
            status: details?.lastSyncedAt ? 'connected' : 'not_connected',
            details,
            isStale: getIsStale(details),
            lastCheckedAt: new Date().toISOString(),
          })
        }
      } catch {
        if (!cancelled) {
          setState({
            status: 'not_connected',
            details: null,
            isStale: false,
            lastCheckedAt: new Date().toISOString(),
          })
        }
      }
    }

    void readStatus()
    const intervalId = window.setInterval(() => {
      void readStatus()
    }, 20_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  return {
    ...state,
    async refresh() {
      setState((current) => ({
        ...current,
        status: 'checking',
      }))

      try {
        const details = await requestExtensionStatus()
        setState({
          status: details?.lastSyncedAt ? 'connected' : 'not_connected',
          details,
          isStale: getIsStale(details),
          lastCheckedAt: new Date().toISOString(),
        })
      } catch {
        setState({
          status: 'not_connected',
          details: null,
          isStale: false,
          lastCheckedAt: new Date().toISOString(),
        })
      }
    },
  }
}
