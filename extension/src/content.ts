import {
  EXTENSION_REQUEST_SYNC_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionSyncPayload,
} from '../../src/shared/extension'

function isPayload(value: unknown): value is ExtensionSyncPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.appBaseUrl === 'string' &&
    Array.isArray(candidate.blockedDomains) &&
    candidate.blockedDomains.every((item) => typeof item === 'string')
  )
}

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return
  }

  if (event.data?.type === EXTENSION_SYNC_MESSAGE && isPayload(event.data.payload)) {
    void chrome.runtime.sendMessage({
      type: EXTENSION_SYNC_MESSAGE,
      payload: event.data.payload,
    })
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === EXTENSION_REQUEST_SYNC_MESSAGE) {
    window.postMessage(
      {
        source: 'stop-procrastinating-extension',
        type: EXTENSION_REQUEST_SYNC_MESSAGE,
      },
      window.location.origin,
    )
  }
})
