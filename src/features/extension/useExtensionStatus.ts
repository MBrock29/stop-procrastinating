import { useEffect, useState } from 'react'
import { requestExtensionStatus } from './extensionBridge'
import type { ExtensionStatusPayload } from '../../shared/extension'

interface ExtensionConnectionState {
  status: 'checking' | 'connected' | 'not_connected'
  details: ExtensionStatusPayload | null
}

const defaultState: ExtensionConnectionState = {
  status: 'checking',
  details: null,
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
          })
        }
      } catch {
        if (!cancelled) {
          setState({
            status: 'not_connected',
            details: null,
          })
        }
      }
    }

    void readStatus()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
