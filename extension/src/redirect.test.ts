import { describe, expect, it } from 'vitest'
import { isRuleActive, resolveRedirectTarget } from './redirect'
import type { ExtensionStatusPayload } from '../../src/shared/extension'

const baseStatus: ExtensionStatusPayload = {
  appBaseUrl: 'https://focus.example.com',
  blockedDomains: ['reddit.com'],
  lastSyncedAt: '2026-05-01T10:00:00.000Z',
}

describe('resolveRedirectTarget', () => {
  it('redirects blocked domains to the interrupt route', () => {
    expect(
      resolveRedirectTarget(baseStatus, 'https://www.reddit.com/r/typescript'),
    ).toBe(
      'https://focus.example.com/interrupt?site=www.reddit.com&source=extension&returnUrl=https%3A%2F%2Fwww.reddit.com%2Fr%2Ftypescript',
    )
  })

  it('does not redirect unrelated domains', () => {
    expect(
      resolveRedirectTarget(baseStatus, 'https://news.ycombinator.com'),
    ).toBeNull()
  })

  it('does not redirect the app origin itself', () => {
    expect(
      resolveRedirectTarget(baseStatus, 'https://focus.example.com/app'),
    ).toBeNull()
  })

  it('does not redirect a one-time allowed url', () => {
    expect(
      resolveRedirectTarget(baseStatus, 'https://www.reddit.com/r/typescript', {
        allowOnceUrl: 'https://www.reddit.com/r/typescript',
        allowOnceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBeNull()
  })
  it('honours pause and schedule windows and carries intervention mode', () => {
    const status = {
      ...baseStatus,
      rules: [
        {
          domain: 'reddit.com',
          scheduleDays: [4],
          scheduleStart: '09:00',
          scheduleEnd: '17:00',
          interventionMode: 'focus' as const,
          pausedUntil: null,
        },
      ],
    }
    const thursday = new Date(2026, 9, 15, 10, 0)
    expect(isRuleActive(status.rules[0], thursday)).toBe(true)
    expect(
      resolveRedirectTarget(status, 'https://reddit.com', { now: thursday }),
    ).toContain('mode=focus')
    expect(
      isRuleActive(
        {
          ...status.rules[0],
          pausedUntil: new Date(thursday.getTime() + 60_000).toISOString(),
        },
        thursday,
      ),
    ).toBe(false)
  })

  it('supports overnight schedules without leaking into inactive days', () => {
    const rule = {
      domain: 'reddit.com',
      scheduleDays: [4],
      scheduleStart: '22:00',
      scheduleEnd: '06:00',
      interventionMode: 'quick' as const,
      pausedUntil: null,
    }
    expect(isRuleActive(rule, new Date(2026, 9, 15, 23, 0))).toBe(true)
    expect(isRuleActive(rule, new Date(2026, 9, 15, 12, 0))).toBe(false)
    expect(isRuleActive(rule, new Date(2026, 9, 16, 1, 0))).toBe(true)
    expect(isRuleActive(rule, new Date(2026, 9, 17, 1, 0))).toBe(false)
  })

  it('protects every instant of every day when all-day protection is enabled', () => {
    const rule = {
      domain: 'reddit.com',
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      scheduleAllDay: true,
      scheduleStart: '09:00',
      scheduleEnd: '17:00',
      interventionMode: 'quick' as const,
      pausedUntil: null,
    }
    for (let day = 0; day < 7; day++) {
      for (const [hour, minute, second] of [
        [0, 0, 0],
        [3, 30, 0],
        [23, 59, 59],
      ]) {
        expect(
          isRuleActive(rule, new Date(2026, 9, 18 + day, hour, minute, second)),
        ).toBe(true)
      }
    }
    const now = new Date(2026, 9, 18, 3, 0)
    expect(
      isRuleActive(
        {
          ...rule,
          pausedUntil: new Date(now.getTime() + 60_000).toISOString(),
        },
        now,
      ),
    ).toBe(false)
    expect(isRuleActive({ ...rule, scheduleDays: [1, 2, 3, 4, 5] }, now)).toBe(
      false,
    )
  })
})
