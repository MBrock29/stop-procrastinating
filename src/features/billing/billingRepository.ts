import { env } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type {
  BillingInterval,
  UserBillingAccount,
} from '../../types/domain'
import type { PricingCurrency } from '../pricing/usePricingCurrency'

interface BillingAccountRow {
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  plan_tier: 'free' | 'pro' | 'premium'
  billing_interval: 'month' | 'year' | null
  billing_currency: string | null
  subscription_status:
    | 'inactive'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
  cancel_at_period_end: boolean
  current_period_end: string | null
  created_at: string
  updated_at: string
}

function mapBillingRow(row: BillingAccountRow): UserBillingAccount {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    planTier: row.plan_tier,
    billingInterval: row.billing_interval,
    billingCurrency: row.billing_currency,
    subscriptionStatus: row.subscription_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function callBillingFunction<T>(path: string, body?: unknown) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured.')
  }

  async function resolveAccessToken() {
    const {
      data: { session: existingSession },
    } = await client.auth.getSession()

    if (existingSession?.access_token) {
      return existingSession.access_token
    }

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await client.auth.refreshSession()

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error('You must be signed in to manage billing.')
    }

    return refreshedSession.access_token
  }

  const accessToken = await resolveAccessToken()
  const response = await fetch(`${env.supabaseUrl}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: env.supabaseAnonKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    url?: string
  } & T

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to complete the billing action.')
  }

  return payload
}

export async function getBillingAccount(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return null
  }

  const { data, error } = await client
    .from('user_billing_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapBillingRow(data as BillingAccountRow)
}

export async function createCheckoutSession(input: {
  planTier: 'pro' | 'premium'
  billingInterval: BillingInterval
  currency: PricingCurrency
}) {
  return callBillingFunction<{ url: string }>('create-stripe-checkout-session', {
    planTier: input.planTier,
    billingInterval: input.billingInterval,
    currency: input.currency.toLowerCase(),
  })
}

export async function createPortalSession() {
  return callBillingFunction<{ url: string }>('create-stripe-portal-session')
}
