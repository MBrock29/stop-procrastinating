import {
  EXTENSION_PRESENCE_MESSAGE,
  EXTENSION_REQUEST_SYNC_MESSAGE,
  EXTENSION_REQUEST_STATUS_MESSAGE,
  EXTENSION_STATUS_RESPONSE_MESSAGE,
  EXTENSION_GET_STATUS_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionStatusPayload,
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

function postPresence(payload: ExtensionStatusPayload | null) {
  window.postMessage(
    {
      source: 'stop-procrastinating-extension',
      type: EXTENSION_PRESENCE_MESSAGE,
      payload,
    },
    window.location.origin,
  )
}

void chrome.runtime
  .sendMessage({
    type: EXTENSION_GET_STATUS_MESSAGE,
  })
  .then((payload: ExtensionStatusPayload) => {
    postPresence(payload)
  })
  .catch(() => {
    postPresence({
      appBaseUrl: window.location.origin,
      blockedDomains: [],
      lastSyncedAt: null,
    })
  })

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

  if (event.data?.type === EXTENSION_REQUEST_STATUS_MESSAGE) {
    void chrome.runtime
      .sendMessage({
        type: EXTENSION_GET_STATUS_MESSAGE,
      })
      .then((payload: ExtensionStatusPayload) => {
        window.postMessage(
          {
            source: 'stop-procrastinating-extension',
            type: EXTENSION_STATUS_RESPONSE_MESSAGE,
            requestId: event.data.requestId,
            payload,
          },
          window.location.origin,
        )
      })
      .catch(() => {
        window.postMessage(
          {
            source: 'stop-procrastinating-extension',
            type: EXTENSION_STATUS_RESPONSE_MESSAGE,
            requestId: event.data.requestId,
            payload: null,
          },
          window.location.origin,
        )
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
