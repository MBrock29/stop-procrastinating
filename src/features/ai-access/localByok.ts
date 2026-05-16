import type { AiProvider } from '../../types/domain'

export interface LocalByokCredentials {
  provider: AiProvider
  apiKey: string
}

function storageKey(userId: string) {
  return `stop-procrastinating.byok.${userId}`
}

export function readLocalByokCredentials(userId: string) {
  const rawValue = window.localStorage.getItem(storageKey(userId))

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as LocalByokCredentials
  } catch {
    return null
  }
}

export function writeLocalByokCredentials(userId: string, credentials: LocalByokCredentials) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(credentials))
}

export function clearLocalByokCredentials(userId: string) {
  window.localStorage.removeItem(storageKey(userId))
}
