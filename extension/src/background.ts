import {
  EXTENSION_ALLOW_ONCE_MESSAGE,
  EXTENSION_CLEAR_STATUS_MESSAGE,
  EXTENSION_GET_STATUS_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionAllowOncePayload,
  type ExtensionStatusPayload,
  type ExtensionSyncPayload,
} from '../../src/shared/extension'
import { resolveRedirectTarget } from './redirect'

const DEFAULT_APP_URL = 'https://betterfocus.live'
const ALLOW_ONCE_TTL_MS = 1000 * 60

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

async function setAllowOnce(payload: ExtensionAllowOncePayload) {
  await chrome.storage.local.set({
    allowOnceUrl: payload.url,
    allowOnceExpiresAt: new Date(Date.now() + ALLOW_ONCE_TTL_MS).toISOString(),
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

  if (message?.type === EXTENSION_ALLOW_ONCE_MESSAGE) {
    void setAllowOnce(message.payload as ExtensionAllowOncePayload).then(() => {
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
  const allowOnce = await chrome.storage.local.get({
    allowOnceUrl: null,
    allowOnceExpiresAt: null,
  })
  const interruptUrl = resolveRedirectTarget(status, details.url, {
    allowOnceUrl: allowOnce.allowOnceUrl as string | null,
    allowOnceExpiresAt: allowOnce.allowOnceExpiresAt as string | null,
  })

  if (interruptUrl) {
    await chrome.tabs.update(details.tabId, {
      url: interruptUrl,
    })
  } else if (
    allowOnce.allowOnceUrl === details.url &&
    allowOnce.allowOnceExpiresAt &&
    new Date(allowOnce.allowOnceExpiresAt).getTime() > Date.now()
  ) {
    await chrome.storage.local.remove(['allowOnceUrl', 'allowOnceExpiresAt'])
  }
})
