import { env } from '../../lib/env'
import type { PlanTier } from '../../types/domain'

export function isByokPubliclyVisible() {
  return env.enableByok
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null
}

export function hasByokAccess(email?: string | null) {
  if (!email) {
    return false
  }

  return env.byokAccessEmails.includes(normalizeEmail(email)!)
}

export function hasPremiumAccess(email?: string | null) {
  if (!email) {
    return false
  }

  return env.premiumAccessEmails.includes(normalizeEmail(email)!)
}

export function hasProAccess(email?: string | null) {
  if (!email) {
    return false
  }

  return env.proAccessEmails.includes(normalizeEmail(email)!)
}

export function canAccessByok(email?: string | null) {
  if (env.enableByok) {
    return true
  }

  return hasByokAccess(email)
}

export function canAccessPremium(email?: string | null) {
  return hasPremiumAccess(email)
}

export function canAccessUsageTab(email?: string | null) {
  return normalizeEmail(email) === 'mbrock19@gmail.com'
}

export function resolveEffectivePlanTier(
  storedPlanTier: PlanTier,
  email?: string | null,
): PlanTier {
  if (storedPlanTier === 'byok' && canAccessByok(email)) {
    return 'byok'
  }

  if (hasPremiumAccess(email)) {
    return 'premium'
  }

  if (storedPlanTier === 'premium') {
    return 'premium'
  }

  if (hasProAccess(email)) {
    return 'pro'
  }

  if (storedPlanTier === 'pro') {
    return 'pro'
  }

  return 'free'
}
