import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { BlockedDomain } from '../../types/domain'

interface BlockedDomainRow {
  id: string
  user_id: string
  domain: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapRow(row: BlockedDomainRow): BlockedDomain {
  return {
    id: row.id,
    userId: row.user_id,
    domain: row.domain,
    isActive: row.is_active,
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
    return JSON.parse(rawValue) as BlockedDomain[]
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
    const nextItems = readDemoDomains(userId).filter((item) => item.id !== domainId)
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
