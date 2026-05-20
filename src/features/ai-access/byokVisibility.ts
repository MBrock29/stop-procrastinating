import { env } from '../../lib/env'

export function isByokPubliclyVisible() {
  return env.enableByok
}

export function hasInternalAccess(email?: string | null) {
  if (!email) {
    return false
  }

  return env.internalAccessEmails.includes(email.trim().toLowerCase())
}

export function canAccessByok(email?: string | null) {
  if (env.enableByok) {
    return true
  }

  return hasInternalAccess(email)
}

export function canAccessPremium(email?: string | null) {
  return hasInternalAccess(email)
}
