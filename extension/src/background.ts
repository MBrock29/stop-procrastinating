import {
  EXTENSION_CLEAR_STATUS_MESSAGE,
  EXTENSION_GET_STATUS_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionStatusPayload,
  type ExtensionSyncPayload,
} from '../../src/shared/extension'
import { resolveRedirectTarget } from './redirect'

const DEFAULT_APP_URL = 'http://localhost:5173'

async function getStatus(): Promise<ExtensionStatusPayload> {
  const stored = await chrome.storage.local.get({
    appBaseUrl: DEFAULT_APP_URL,
    blockedDomains: [],
    lastSyncedAt: null,
  })

  return {
    appBaseUrl: stored.appBaseUrl as string,
    blockedDomains: stored.blockedDomains as string[],
    lastSyncedAt: stored.lastSyncedAt as string | null,
  }
}

async function setStatus(payload: ExtensionSyncPayload) {
  await chrome.storage.local.set({
    appBaseUrl: payload.appBaseUrl,
    blockedDomains: payload.blockedDomains,
    lastSyncedAt: new Date().toISOString(),
  })
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    appBaseUrl: DEFAULT_APP_URL,
    blockedDomains: [],
    lastSyncedAt: null,
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === EXTENSION_SYNC_MESSAGE) {
    void setStatus(message.payload as ExtensionSyncPayload).then(() => {
      sendResponse({ ok: true })
    })
    return true
  }

  if (message?.type === EXTENSION_GET_STATUS_MESSAGE) {
    void getStatus().then((status) => {
      sendResponse(status)
    })
    return true
  }

  if (message?.type === EXTENSION_CLEAR_STATUS_MESSAGE) {
    void chrome.storage.local
      .set({
        appBaseUrl: DEFAULT_APP_URL,
        blockedDomains: [],
        lastSyncedAt: null,
      })
      .then(() => sendResponse({ ok: true }))
    return true
  }

  return false
})

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || details.tabId < 0) {
    return
  }

  const status = await getStatus()
  const interruptUrl = resolveRedirectTarget(status, details.url)

  if (interruptUrl) {
    await chrome.tabs.update(details.tabId, {
      url: interruptUrl,
    })
  }
})
