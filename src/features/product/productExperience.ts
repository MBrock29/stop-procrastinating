import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { InterruptSession } from '../../types/domain'

export type ProductEventType =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'extension_install_clicked'
  | 'test_interruption_started'
  | 'interruption_started'
  | 'interruption_completed'
  | 'interruption_bypassed'
  | 'source_created'
  | 'upgrade_clicked'
  | 'site_rule_paused'
  | 'site_rule_resumed'

export interface ProductProfile {
  learningCategory: string | null
  learningGoal: string | null
  onboardingCompletedAt: string | null
}

function profileKey(userId: string) {
  return `better-focus.product-profile.${userId}`
}
function eventKey(userId: string) {
  return `better-focus.product-events.${userId}`
}

export function readLocalProductProfile(userId: string): ProductProfile {
  try {
    return (
      JSON.parse(localStorage.getItem(profileKey(userId)) ?? 'null') ?? {
        learningCategory: null,
        learningGoal: null,
        onboardingCompletedAt: null,
      }
    )
  } catch {
    return {
      learningCategory: null,
      learningGoal: null,
      onboardingCompletedAt: null,
    }
  }
}

export async function getProductProfile(
  userId: string,
): Promise<ProductProfile> {
  const client = getSupabaseBrowserClient()
  if (!client) return readLocalProductProfile(userId)
  const { data, error } = await client
    .from('user_product_profiles')
    .select('learning_category,learning_goal,onboarding_completed_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    learningCategory: data?.learning_category ?? null,
    learningGoal: data?.learning_goal ?? null,
    onboardingCompletedAt: data?.onboarding_completed_at ?? null,
  }
}

export async function completeOnboarding(
  userId: string,
  input: { learningCategory: string; learningGoal: string },
) {
  const profile: ProductProfile = {
    learningCategory: input.learningCategory,
    learningGoal: input.learningGoal,
    onboardingCompletedAt: new Date().toISOString(),
  }
  const client = getSupabaseBrowserClient()
  if (!client) {
    localStorage.setItem(profileKey(userId), JSON.stringify(profile))
    return profile
  }
  const { error } = await client
    .from('user_product_profiles')
    .upsert({
      user_id: userId,
      learning_category: profile.learningCategory,
      learning_goal: profile.learningGoal,
      onboarding_completed_at: profile.onboardingCompletedAt,
      updated_at: profile.onboardingCompletedAt,
    })
  if (error) throw error
  return profile
}

export async function trackProductEvent(
  userId: string,
  eventType: ProductEventType,
  properties: Record<string, string | number | boolean | null> = {},
) {
  try {
    await recordProductEvent(userId, eventType, properties)
  } catch {
    console.warn('Product event could not be recorded.')
  }
}

async function recordProductEvent(
  userId: string,
  eventType: ProductEventType,
  properties: Record<string, string | number | boolean | null> = {},
) {
  const safeProperties = Object.fromEntries(
    Object.entries(properties)
      .slice(0, 20)
      .filter(
        ([, value]) =>
          ['string', 'number', 'boolean'].includes(typeof value) ||
          value === null,
      )
      .map(([key, value]) => [
        key.slice(0, 80),
        typeof value === 'string' ? value.slice(0, 300) : value,
      ]),
  )
  const analytics = (
    window as unknown as {
      umami?: { track: (name: string, data?: object) => void }
    }
  ).umami
  analytics?.track(eventType, safeProperties)
  const client = getSupabaseBrowserClient()
  if (!client) {
    const key = eventKey(userId)
    const current = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          {
            eventType,
            properties: safeProperties,
            occurredAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 500),
      ),
    )
    return
  }
  const { error } = await client
    .from('product_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      properties: safeProperties,
    })
  if (error) console.error('Unable to record product event:', error.message)
}

export interface OutcomeMetrics {
  todayIntercepted: number
  todayCompleted: number
  weekIntercepted: number
  weekCompleted: number
  weekBypassed: number
  estimatedMinutes: number
  completionRate: number
}

export function calculateOutcomeMetrics(
  sessions: InterruptSession[],
  now = new Date(),
): OutcomeMetrics {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const week = new Date(today)
  week.setDate(week.getDate() - 6)
  const intercepted = sessions.filter(
    (item) => item.source === 'extension' && new Date(item.triggeredAt) <= now,
  )
  const todaySessions = intercepted.filter(
    (item) => new Date(item.triggeredAt) >= today,
  )
  const weekSessions = intercepted.filter(
    (item) => new Date(item.triggeredAt) >= week,
  )
  const weekCompleted = weekSessions.filter(
    (item) => item.outcome === 'completed',
  ).length
  const weekBypassed = weekSessions.filter(
    (item) => item.outcome === 'bypassed',
  ).length
  return {
    todayIntercepted: todaySessions.length,
    todayCompleted: todaySessions.filter((item) => item.outcome === 'completed')
      .length,
    weekIntercepted: weekSessions.length,
    weekCompleted,
    weekBypassed,
    estimatedMinutes: Math.round(weekCompleted * 0.5),
    completionRate: weekSessions.length
      ? Math.round((weekCompleted / weekSessions.length) * 100)
      : 0,
  }
}
