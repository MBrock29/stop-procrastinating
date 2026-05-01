import { domainMatchesRule } from '../../src/utils/domains'
import {
  EXTENSION_CLEAR_STATUS_MESSAGE,
  EXTENSION_GET_STATUS_MESSAGE,
  EXTENSION_SYNC_MESSAGE,
  type ExtensionStatusPayload,
  type ExtensionSyncPayload,
} from '../../src/shared/extension'

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

function isAppUrl(appBaseUrl: string, url: URL) {
  try {
    const appUrl = new URL(appBaseUrl)
    return appUrl.origin === url.origin
  } catch {
    return false
  }
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
  const nextUrl = new URL(details.url)

  if (!status.blockedDomains.length || isAppUrl(status.appBaseUrl, nextUrl)) {
    return
  }

  const hostname = nextUrl.hostname
  const isBlocked = status.blockedDomains.some((rule) => domainMatchesRule(hostname, rule))

  if (!isBlocked) {
    return
  }

  const interruptUrl = new URL('/interrupt', status.appBaseUrl)
  interruptUrl.searchParams.set('site', hostname)
  interruptUrl.searchParams.set('source', 'extension')

  await chrome.tabs.update(details.tabId, {
    url: interruptUrl.toString(),
  })
})
