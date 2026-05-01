const COMMON_SUBDOMAIN_PREFIX = 'www.'

function withProtocol(value: string) {
  if (value.includes('://')) {
    return value
  }

  return `https://${value}`
}

export function normalizeDomainInput(value: string) {
  const trimmed = value.trim().toLowerCase()

  if (!trimmed) {
    throw new Error('Enter a domain or URL to block.')
  }

  let url: URL

  try {
    url = new URL(withProtocol(trimmed))
  } catch {
    throw new Error('That does not look like a valid domain or URL.')
  }

  const hostname = url.hostname.replace(/\.$/, '')

  if (!hostname || !hostname.includes('.')) {
    throw new Error('Please use a full hostname such as reddit.com.')
  }

  return hostname.startsWith(COMMON_SUBDOMAIN_PREFIX)
    ? hostname.slice(COMMON_SUBDOMAIN_PREFIX.length)
    : hostname
}

export function domainMatchesRule(hostname: string, rule: string) {
  const normalizedHost = normalizeDomainInput(hostname)
  const normalizedRule = normalizeDomainInput(rule)

  return (
    normalizedHost === normalizedRule || normalizedHost.endsWith(`.${normalizedRule}`)
  )
}
