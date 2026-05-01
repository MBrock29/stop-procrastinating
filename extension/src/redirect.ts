import { domainMatchesRule } from '../../src/utils/domains'
import type { ExtensionStatusPayload } from '../../src/shared/extension'

function isAppUrl(appBaseUrl: string, url: URL) {
  try {
    const appUrl = new URL(appBaseUrl)
    return appUrl.origin === url.origin
  } catch {
    return false
  }
}

export function resolveRedirectTarget(status: ExtensionStatusPayload, targetUrl: string) {
  const nextUrl = new URL(targetUrl)

  if (!status.blockedDomains.length || isAppUrl(status.appBaseUrl, nextUrl)) {
    return null
  }

  const hostname = nextUrl.hostname
  const isBlocked = status.blockedDomains.some((rule) => domainMatchesRule(hostname, rule))

  if (!isBlocked) {
    return null
  }

  const interruptUrl = new URL('/interrupt', status.appBaseUrl)
  interruptUrl.searchParams.set('site', hostname)
  interruptUrl.searchParams.set('source', 'extension')

  return interruptUrl.toString()
}
