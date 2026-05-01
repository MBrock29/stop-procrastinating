import { env } from '../../lib/env'
import {
  EXTENSION_REQUEST_SYNC_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
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
