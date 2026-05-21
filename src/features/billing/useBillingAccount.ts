import { useCallback, useEffect, useState } from 'react'
import type { BillingInterval, UserBillingAccount } from '../../types/domain'
import { useAuth } from '../auth/useAuth'
import { createCheckoutSession, createPortalSession, getBillingAccount } from './billingRepository'
import type { PricingCurrency } from '../pricing/usePricingCurrency'

export function useBillingAccount() {
  const { user } = useAuth()
  const [billingAccount, setBillingAccount] = useState<UserBillingAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setBillingAccount(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const nextAccount = await getBillingAccount(user.id)
      setBillingAccount(nextAccount)
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to load billing details.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function startCheckout(input: {
    planTier: 'pro' | 'premium'
    billingInterval: BillingInterval
    currency: PricingCurrency
  }) {
    const result = await createCheckoutSession(input)
    window.location.href = result.url
  }

  async function openPortal() {
    const result = await createPortalSession()
    window.location.href = result.url
  }

  return {
    billingAccount,
    isLoading,
    error,
    refresh,
    startCheckout,
    openPortal,
  }
}
