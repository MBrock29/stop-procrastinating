import { describe, expect, it } from 'vitest'
import { domainMatchesRule, normalizeDomainInput } from './domains'

describe('normalizeDomainInput', () => {
  it('normalizes a bare domain', () => {
    expect(normalizeDomainInput('reddit.com')).toBe('reddit.com')
  })

  it('strips www from hostnames', () => {
    expect(normalizeDomainInput('www.reddit.com')).toBe('reddit.com')
  })

  it('accepts full URLs and keeps the host', () => {
    expect(normalizeDomainInput('https://news.ycombinator.com/item?id=1')).toBe(
      'news.ycombinator.com',
    )
  })
})

describe('domainMatchesRule', () => {
  it('matches the exact rule host', () => {
    expect(domainMatchesRule('reddit.com', 'reddit.com')).toBe(true)
  })

  it('matches subdomains of a blocked rule', () => {
    expect(domainMatchesRule('old.reddit.com', 'reddit.com')).toBe(true)
  })

  it('does not match unrelated domains', () => {
    expect(domainMatchesRule('lobste.rs', 'reddit.com')).toBe(false)
  })
})
