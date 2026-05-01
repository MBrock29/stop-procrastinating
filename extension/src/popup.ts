import {
  EXTENSION_CLEAR_STATUS_MESSAGE,
  EXTENSION_GET_STATUS_MESSAGE,
  EXTENSION_REQUEST_SYNC_MESSAGE,
  type ExtensionStatusPayload,
} from '../../src/shared/extension'

const root = document.querySelector<HTMLDivElement>('#app')

async function getStatus() {
  return (await chrome.runtime.sendMessage({
    type: EXTENSION_GET_STATUS_MESSAGE,
  })) as ExtensionStatusPayload
}

async function requestSyncFromActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  if (!tab?.id) {
    return false
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: EXTENSION_REQUEST_SYNC_MESSAGE,
  })

  return true
}

async function render() {
  if (!root) {
    return
  }

  const status = await getStatus()
  root.innerHTML = `
    <div class="popup-shell">
      <p class="eyebrow">Stop Procrastinating</p>
      <h1>Redirect shield is active</h1>
      <p class="body">
        ${status.blockedDomains.length} blocked domain${status.blockedDomains.length === 1 ? '' : 's'} cached locally.
      </p>
      <div class="status-card">
        <div class="label">App URL</div>
        <div class="value">${status.appBaseUrl}</div>
        <div class="label">Last sync</div>
        <div class="value">${status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : 'Not synced yet'}</div>
      </div>
      <div class="button-stack">
        <button class="primary-button" id="open-app">Open app</button>
        <button class="secondary-button" id="sync-tab">Sync from current app tab</button>
        <button class="secondary-button" id="clear-cache">Clear cached rules</button>
      </div>
    </div>
  `

  root.querySelector<HTMLButtonElement>('#open-app')?.addEventListener('click', () => {
    void chrome.tabs.create({ url: status.appBaseUrl })
  })

  root.querySelector<HTMLButtonElement>('#sync-tab')?.addEventListener('click', () => {
    void requestSyncFromActiveTab().then(() => {
      window.setTimeout(() => {
        void render()
      }, 250)
    })
  })

  root.querySelector<HTMLButtonElement>('#clear-cache')?.addEventListener('click', () => {
    void chrome.runtime
      .sendMessage({
        type: EXTENSION_CLEAR_STATUS_MESSAGE,
      })
      .then(() => render())
  })
}

if (root) {
  void render()
}
