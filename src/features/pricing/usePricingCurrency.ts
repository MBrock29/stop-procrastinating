import { useMemo } from 'react'

export type PricingCurrency = 'USD' | 'GBP' | 'EUR'

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

function getRegionFromLocale(locale: string) {
  if (!locale) {
    return null
  }

  try {
    if (typeof Intl.Locale === 'function') {
      const intlLocale = new Intl.Locale(locale)
      return intlLocale.region?.toUpperCase() ?? null
    }
  } catch {
    // Fall back to simple parsing below.
  }

  return locale.split('-')[1]?.toUpperCase() ?? null
}

function detectCurrency(): PricingCurrency {
  const localeCandidates = [
    Intl.DateTimeFormat().resolvedOptions().locale,
    ...(typeof navigator !== 'undefined' ? navigator.languages ?? [] : []),
    typeof navigator !== 'undefined' ? navigator.language : null,
  ].filter((value): value is string => Boolean(value))
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
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

  for (const locale of localeCandidates) {
    const region = getRegionFromLocale(locale)

    if (region === 'GB') {
      return 'GBP'
    }

    if (region && euroRegions.has(region)) {
      return 'EUR'
    }
  }

  if (timezone === 'Europe/London') {
    return 'GBP'
  }

  return 'USD'
}

export function usePricingCurrency() {
  const currency = typeof window === 'undefined' ? 'USD' : detectCurrency()
  const prices = useMemo(() => priceMap[currency], [currency])

  return {
    currency,
    prices,
  }
}
