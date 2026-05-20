import { useEffect, useMemo, useState } from 'react'

export type PricingCurrency = 'USD' | 'GBP' | 'EUR'

const storageKey = 'better-focus.pricing-currency'

const priceMap = {
  USD: {
    freeMonthly: '$0',
    proMonthly: '$3.99',
    proAnnual: '$39.90',
    premiumMonthly: '$9.99',
    premiumAnnual: '$99.90',
  },
  GBP: {
    freeMonthly: '£0',
    proMonthly: '£2.99',
    proAnnual: '£29.90',
    premiumMonthly: '£6.99',
    premiumAnnual: '£69.90',
  },
  EUR: {
    freeMonthly: '€0',
    proMonthly: '€3.49',
    proAnnual: '€34.90',
    premiumMonthly: '€8.49',
    premiumAnnual: '€84.90',
  },
} as const

function detectCurrency(): PricingCurrency {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  const region = locale.split('-')[1]?.toUpperCase()
  const euroRegions = new Set([
    'AT',
    'BE',
    'CY',
    'DE',
    'EE',
    'ES',
    'FI',
    'FR',
    'GR',
    'HR',
    'IE',
    'IT',
    'LT',
    'LU',
    'LV',
    'MT',
    'NL',
    'PT',
    'SI',
    'SK',
  ])

  if (region === 'GB') {
    return 'GBP'
  }

  if (region && euroRegions.has(region)) {
    return 'EUR'
  }

  return 'USD'
}

export function usePricingCurrency() {
  const [currency, setCurrency] = useState<PricingCurrency>(() => {
    if (typeof window === 'undefined') {
      return 'USD'
    }

    const stored = window.localStorage.getItem(storageKey)
    if (stored === 'USD' || stored === 'GBP' || stored === 'EUR') {
      return stored
    }

    return detectCurrency()
  })

  useEffect(() => {
    window.localStorage.setItem(storageKey, currency)
  }, [currency])

  const prices = useMemo(() => priceMap[currency], [currency])

  return {
    currency,
    setCurrency,
    prices,
  }
}
