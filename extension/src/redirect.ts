import { domainMatchesRule } from '../../src/utils/domains'
import type { ExtensionStatusPayload } from '../../src/shared/extension'

interface RedirectOptions {
  allowOnceUrl?: string | null
  allowOnceExpiresAt?: string | null
}

function isAppUrl(appBaseUrl: string, url: URL) {
  try {
    const appUrl = new URL(appBaseUrl)
    return appUrl.origin === url.origin
  } catch {
    return false
  }
}

function matchesAllowOnce(targetUrl: string, options?: RedirectOptions) {
  if (!options?.allowOnceUrl || !options.allowOnceExpiresAt) {
    return false
  }

  if (new Date(options.allowOnceExpiresAt).getTime() <= Date.now()) {
    return false
  }

  return options.allowOnceUrl === targetUrl
}

export function resolveRedirectTarget(
  status: ExtensionStatusPayload,
  targetUrl: string,
  options?: RedirectOptions,
) {
  const nextUrl = new URL(targetUrl)

  if (
    !status.blockedDomains.length ||
    isAppUrl(status.appBaseUrl, nextUrl) ||
    matchesAllowOnce(targetUrl, options)
  ) {
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
  interruptUrl.searchParams.set('returnUrl', targetUrl)

  return interruptUrl.toString()
}
