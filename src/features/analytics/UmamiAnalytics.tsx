import { useEffect } from 'react'
import { env } from '../../lib/env'

export function UmamiAnalytics() {
  useEffect(() => {
    if (!env.umamiWebsiteId || typeof document === 'undefined') {
      return
    }

    const existing = document.querySelector(
      'script[data-better-focus-analytics="umami"]',
    )

    if (existing) {
      return
    }

    const script = document.createElement('script')
    script.defer = true
    script.src = env.umamiScriptUrl
    script.dataset.websiteId = env.umamiWebsiteId
    script.dataset.betterFocusAnalytics = 'umami'
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return null
}
