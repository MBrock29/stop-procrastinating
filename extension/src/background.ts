chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    appBaseUrl: 'http://localhost:5173',
    blockedDomains: [],
    lastSyncedAt: null,
  })
})
