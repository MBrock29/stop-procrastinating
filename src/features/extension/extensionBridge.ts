import { env } from '../../lib/env'
import {
  EXTENSION_PRESENCE_MESSAGE,
  EXTENSION_REQUEST_SYNC_MESSAGE,
  EXTENSION_REQUEST_STATUS_MESSAGE,
  EXTENSION_STATUS_RESPONSE_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionStatusPayload,
  type ExtensionSyncPayload,
} from '../../shared/extension'

function getWindowMessage(payload: ExtensionSyncPayload) {
  return {
    source: 'stop-procrastinating-app',
    type: EXTENSION_SYNC_MESSAGE,
    payload,
  }
}

export function syncExtensionRules(blockedDomains: string[]) {
  window.postMessage(
    getWindowMessage({
      appBaseUrl: env.appUrl,
      blockedDomains,
    }),
    window.location.origin,
  )
}

export function subscribeToExtensionSyncRequests(onRequest: () => void) {
  function handleMessage(event: MessageEvent) {
    if (event.source !== window || event.origin !== window.location.origin) {
      return
    }

    if (event.data?.type === EXTENSION_REQUEST_SYNC_MESSAGE) {
      onRequest()
    }
  }

  window.addEventListener('message', handleMessage)

  return () => {
    window.removeEventListener('message', handleMessage)
  }
}

export function requestExtensionStatus(timeoutMs = 1500) {
  return new Promise<ExtensionStatusPayload | null>((resolve) => {
    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Date.now())

    let settled = false

    function finish(payload: ExtensionStatusPayload | null) {
      if (settled) {
        return
      }

      settled = true
      window.removeEventListener('message', handleMessage)
      window.clearTimeout(timeoutId)
      resolve(payload)
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return
      }

      if (event.data?.type === EXTENSION_PRESENCE_MESSAGE) {
        finish((event.data.payload as ExtensionStatusPayload | null) ?? null)
        return
      }

      if (
        event.data?.type !== EXTENSION_STATUS_RESPONSE_MESSAGE ||
        event.data?.requestId !== requestId
      ) {
        return
      }

      finish((event.data.payload as ExtensionStatusPayload | null) ?? null)
    }

    const timeoutId = window.setTimeout(() => {
      finish(null)
    }, timeoutMs)

    window.addEventListener('message', handleMessage)
    window.postMessage(
      {
        source: 'stop-procrastinating-app',
        type: EXTENSION_REQUEST_STATUS_MESSAGE,
        requestId,
      },
      window.location.origin,
    )
  })
}
