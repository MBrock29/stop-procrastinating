import { describe, expect, it } from 'vitest'
import type { InterruptSession } from '../../types/domain'
import { calculateOutcomeMetrics } from './productExperience'

function session(
  id: string,
  triggeredAt: string,
  outcome: InterruptSession['outcome'],
): InterruptSession {
  return {
    source: 'extension',
    id,
    userId: 'user-1',
    blockedDomain: 'reddit.com',
    triggeredAt,
    completedAt: outcome === 'started' ? null : triggeredAt,
    outcome,
    interventionMode: 'quick',
  }
}

describe('calculateOutcomeMetrics', () => {
  it('reports real daily and rolling seven-day interruption outcomes', () => {
    const now = new Date(2026, 9, 15, 12)
    const today = new Date(2026, 9, 15, 9).toISOString()
    const yesterday = new Date(2026, 9, 14, 9).toISOString()
    const sixDaysAgo = new Date(2026, 9, 9, 9).toISOString()
    const sevenDaysAgo = new Date(2026, 9, 8, 23).toISOString()

    expect(calculateOutcomeMetrics([
      session('1', today, 'completed'),
      session('2', today, 'bypassed'),
      session('3', yesterday, 'completed'),
      session('4', sixDaysAgo, 'started'),
      session('5', sevenDaysAgo, 'completed'),
    ], now)).toEqual({
      todayIntercepted: 2,
      todayCompleted: 1,
      weekIntercepted: 4,
      weekCompleted: 2,
      weekBypassed: 1,
      estimatedMinutes: 1,
      completionRate: 50,
    })
  })

  it('returns zero values when there are no interruption sessions', () => {
    expect(calculateOutcomeMetrics([], new Date(2026, 9, 15, 12))).toEqual({
      todayIntercepted: 0,
      todayCompleted: 0,
      weekIntercepted: 0,
      weekCompleted: 0,
      weekBypassed: 0,
      estimatedMinutes: 0,
      completionRate: 0,
    })
  })

  it('does not count manual practice, onboarding, legacy or future sessions as distractions', () => {
    const now = new Date(2026, 9, 15, 12)
    const timestamp = new Date(2026, 9, 15, 10).toISOString()
    const practice = { ...session('1', timestamp, 'completed'), source: 'practice' as const }
    const onboarding = { ...session('2', timestamp, 'completed'), source: 'onboarding' as const }
    const legacy = { ...session('3', timestamp, 'completed'), source: undefined }
    const future = session('4', new Date(2026, 9, 16).toISOString(), 'completed')
    expect(calculateOutcomeMetrics([practice, onboarding, legacy, future], now).weekCompleted).toBe(0)
  })
})
