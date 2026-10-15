import { domainMatchesRule } from '../../src/utils/domains'
import type { ExtensionStatusPayload } from '../../src/shared/extension'

interface RedirectOptions {
  allowOnceUrl?: string | null
  allowOnceExpiresAt?: string | null
  now?: Date
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

export function isRuleActive(
  rule: NonNullable<ExtensionStatusPayload['rules']>[number],
  now = new Date(),
) {
  if (rule.pausedUntil && new Date(rule.pausedUntil).getTime() > now.getTime())
    return false
  if (rule.scheduleAllDay) return rule.scheduleDays.includes(now.getDay())
  const minutes = now.getHours() * 60 + now.getMinutes()
  const parse = (value: string) => {
    const [hours, mins] = value.split(':').map(Number)
    return hours * 60 + mins
  }
  const start = parse(rule.scheduleStart)
  const end = parse(rule.scheduleEnd)
  if (start < end)
    return (
      rule.scheduleDays.includes(now.getDay()) &&
      minutes >= start &&
      minutes < end
    )
  if (minutes >= start) return rule.scheduleDays.includes(now.getDay())
  const previousDay = (now.getDay() + 6) % 7
  return minutes < end && rule.scheduleDays.includes(previousDay)
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
  const configuredRule = status.rules?.find((rule) =>
    domainMatchesRule(hostname, rule.domain),
  )
  const isBlocked = configuredRule
    ? isRuleActive(configuredRule, options?.now)
    : status.blockedDomains.some((rule) => domainMatchesRule(hostname, rule))

  if (!isBlocked) {
    return null
  }

  const interruptUrl = new URL('/interrupt', status.appBaseUrl)
  interruptUrl.searchParams.set('site', hostname)
  interruptUrl.searchParams.set('source', 'extension')
  interruptUrl.searchParams.set('returnUrl', targetUrl)
  if (configuredRule)
    interruptUrl.searchParams.set('mode', configuredRule.interventionMode)

  return interruptUrl.toString()
}
