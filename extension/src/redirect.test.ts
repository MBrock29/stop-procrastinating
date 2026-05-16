import { describe, expect, it } from 'vitest'
import { resolveRedirectTarget } from './redirect'
import type { ExtensionStatusPayload } from '../../src/shared/extension'

const baseStatus: ExtensionStatusPayload = {
  appBaseUrl: 'https://focus.example.com',
  blockedDomains: ['reddit.com'],
  lastSyncedAt: '2026-05-01T10:00:00.000Z',
}

describe('resolveRedirectTarget', () => {
  it('redirects blocked domains to the interrupt route', () => {
    expect(resolveRedirectTarget(baseStatus, 'https://www.reddit.com/r/typescript')).toBe(
      'https://focus.example.com/interrupt?site=www.reddit.com&source=extension&returnUrl=https%3A%2F%2Fwww.reddit.com%2Fr%2Ftypescript',
    )
  })

  it('does not redirect unrelated domains', () => {
    expect(resolveRedirectTarget(baseStatus, 'https://news.ycombinator.com')).toBeNull()
  })

  it('does not redirect the app origin itself', () => {
    expect(resolveRedirectTarget(baseStatus, 'https://focus.example.com/app')).toBeNull()
  })

  it('does not redirect a one-time allowed url', () => {
    expect(
      resolveRedirectTarget(baseStatus, 'https://www.reddit.com/r/typescript', {
        allowOnceUrl: 'https://www.reddit.com/r/typescript',
        allowOnceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBeNull()
  })
})
