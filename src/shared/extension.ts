export const EXTENSION_SYNC_MESSAGE = 'STOP_PROCRASTINATING_SYNC_RULES'
export const EXTENSION_REQUEST_SYNC_MESSAGE = 'STOP_PROCRASTINATING_REQUEST_SYNC'
export const EXTENSION_GET_STATUS_MESSAGE = 'STOP_PROCRASTINATING_GET_STATUS'
export const EXTENSION_CLEAR_STATUS_MESSAGE = 'STOP_PROCRASTINATING_CLEAR_RULES'

export interface ExtensionSyncPayload {
  appBaseUrl: string
  blockedDomains: string[]
}

export interface ExtensionStatusPayload extends ExtensionSyncPayload {
  lastSyncedAt: string | null
}
