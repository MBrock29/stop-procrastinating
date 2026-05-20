import { env } from '../../lib/env'

export function isByokPubliclyVisible() {
  return env.enableByok
}

export function canAccessByok(email?: string | null) {
  if (env.enableByok) {
    return true
  }

  if (!email) {
    return false
  }

  return env.byokAllowedEmails.includes(email.trim().toLowerCase())
}
