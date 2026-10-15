import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { BlockedDomain, InterventionMode } from '../../types/domain'

interface BlockedDomainRow {
  id: string
  user_id: string
  domain: string
  is_active: boolean
  schedule_days?: number[]
  schedule_all_day?: boolean
  schedule_start?: string
  schedule_end?: string
  intervention_mode?: InterventionMode
  paused_until?: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: BlockedDomainRow): BlockedDomain {
  return {
    id: row.id,
    userId: row.user_id,
    domain: row.domain,
    isActive: row.is_active,
    scheduleDays: row.schedule_days ?? [1, 2, 3, 4, 5],
    scheduleAllDay: row.schedule_all_day ?? false,
    scheduleStart: row.schedule_start?.slice(0, 5) ?? '09:00',
    scheduleEnd: row.schedule_end?.slice(0, 5) ?? '17:00',
    interventionMode: row.intervention_mode ?? 'quick',
    pausedUntil: row.paused_until ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function storageKey(userId: string) {
  return `stop-procrastinating.blocked-domains.${userId}`
}

function readDemoDomains(userId: string) {
  const rawValue = window.localStorage.getItem(storageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return (JSON.parse(rawValue) as BlockedDomain[]).map((item) => ({
      ...item,
      scheduleDays: item.scheduleDays ?? [1, 2, 3, 4, 5],
      scheduleAllDay: item.scheduleAllDay ?? false,
      scheduleStart: item.scheduleStart ?? '09:00',
      scheduleEnd: item.scheduleEnd ?? '17:00',
      interventionMode: item.interventionMode ?? 'quick',
      pausedUntil: item.pausedUntil ?? null,
    }))
  } catch {
    return []
  }
}

function writeDemoDomains(userId: string, domains: BlockedDomain[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(domains))
}

export async function listBlockedDomains(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const items = readDemoDomains(userId)
    return items.sort((left, right) => left.domain.localeCompare(right.domain))
  }

  const { data, error } = await client
    .from('blocked_domains')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => mapRow(item as BlockedDomainRow))
}

export async function createBlockedDomain(userId: string, domain: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const now = new Date().toISOString()
    const nextDomain: BlockedDomain = {
      id: crypto.randomUUID(),
      userId,
      domain,
      isActive: true,
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      scheduleAllDay: true,
      scheduleStart: '09:00',
      scheduleEnd: '17:00',
      interventionMode: 'quick',
      pausedUntil: null,
      createdAt: now,
      updatedAt: now,
    }
    const existing = readDemoDomains(userId)
    writeDemoDomains(userId, [nextDomain, ...existing])
    return nextDomain
  }

  const { data, error } = await client
    .from('blocked_domains')
    .insert({
      user_id: userId,
      domain,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as BlockedDomainRow)
}

export async function updateBlockedDomainControls(
  userId: string,
  domainId: string,
  input: {
    scheduleDays: number[]
    scheduleAllDay: boolean
    scheduleStart: string
    scheduleEnd: string
    interventionMode: InterventionMode
    pausedUntil: string | null
  },
) {
  if (
    !input.scheduleDays.length ||
    input.scheduleDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    throw new Error('Choose at least one day of the week.')
  }
  if (
    ![input.scheduleStart, input.scheduleEnd].every((time) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    ) ||
    input.scheduleStart === input.scheduleEnd
  ) {
    throw new Error('Choose different valid start and end times.')
  }
  const client = getSupabaseBrowserClient()
  if (!client) {
    const nextItems = readDemoDomains(userId).map((item) =>
      item.id === domainId
        ? {
            ...item,
            ...input,
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
    writeDemoDomains(userId, nextItems)
    return nextItems.find((item) => item.id === domainId) ?? null
  }
  const { data, error } = await client
    .from('blocked_domains')
    .update({
      schedule_days: input.scheduleDays,
      schedule_start: input.scheduleStart,
      schedule_all_day: input.scheduleAllDay,
      schedule_end: input.scheduleEnd,
      intervention_mode: input.interventionMode,
      paused_until: input.pausedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('id', domainId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return mapRow(data as BlockedDomainRow)
}

export async function updateBlockedDomainState(
  userId: string,
  domainId: string,
  isActive: boolean,
) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextItems = readDemoDomains(userId).map((item) =>
      item.id === domainId
        ? {
            ...item,
            isActive,
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
    writeDemoDomains(userId, nextItems)
    return nextItems.find((item) => item.id === domainId) ?? null
  }

  const { data, error } = await client
    .from('blocked_domains')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', domainId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as BlockedDomainRow)
}

export async function deleteBlockedDomain(userId: string, domainId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const nextItems = readDemoDomains(userId).filter(
      (item) => item.id !== domainId,
    )
    writeDemoDomains(userId, nextItems)
    return
  }

  const { error } = await client
    .from('blocked_domains')
    .delete()
    .eq('id', domainId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
