import { env } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type {
  AiAccessSettings,
  AiGenerationEvent,
  ByokCredentialStatus,
  PlanTier,
  RedirectBackMode,
  SupportedAiModel,
} from '../../types/domain'

interface AiSettingsRow {
  user_id: string
  plan_tier: PlanTier
  byok_provider: 'openai' | 'openrouter'
  preferred_model: SupportedAiModel
  show_continue_to_site_button: boolean
  redirect_back_mode: RedirectBackMode
  redirect_back_card_count: number
  created_at: string
  updated_at: string
}

interface AiGenerationEventRow {
  id: string
  user_id: string
  topic: string
  plan_tier: PlanTier
  provider: 'openai' | 'openrouter'
  model: string
  card_count: number
  status: 'success' | 'limit_exceeded' | 'rate_limited' | 'blocked' | 'failed'
  input_tokens: number | null
  output_tokens: number | null
  estimated_cost_usd: number | null
  used_byok: boolean
  failure_reason: string | null
  created_at: string
}

interface ByokCredentialPayload {
  credential: {
    provider: 'openai' | 'openrouter'
    lastFour: string
    updatedAt: string
  } | null
  error?: string
}

function formatAiSettingsError(error: {
  message?: string
  details?: string
  hint?: string
}) {
  const combined = [error.message, error.details, error.hint].filter(Boolean).join(' ')

  if (
    combined.includes('user_ai_settings_preferred_model_check') ||
    combined.includes('preferred_model')
  ) {
    return 'Your database is still using the older AI model list. Run the latest AI model migration, then try again.'
  }

  return error.message ?? 'Unable to save AI settings.'
}

function settingsStorageKey(userId: string) {
  return `stop-procrastinating.ai-settings.${userId}`
}

function eventsStorageKey(userId: string) {
  return `stop-procrastinating.ai-events.${userId}`
}

function readDemoSettings(userId: string): AiAccessSettings {
  const rawValue = window.localStorage.getItem(settingsStorageKey(userId))

  if (!rawValue) {
    return {
      userId,
      planTier: 'free',
      byokProvider: 'openrouter',
      preferredModel: 'gpt-4.1-mini',
      showContinueToSiteButton: true,
      redirectBackMode: 'manual',
      redirectBackCardCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  try {
    return JSON.parse(rawValue) as AiAccessSettings
  } catch {
    return {
      userId,
      planTier: 'free',
      byokProvider: 'openrouter',
      preferredModel: 'gpt-4.1-mini',
      showContinueToSiteButton: true,
      redirectBackMode: 'manual',
      redirectBackCardCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

function writeDemoSettings(userId: string, settings: AiAccessSettings) {
  window.localStorage.setItem(settingsStorageKey(userId), JSON.stringify(settings))
}

export function readCachedAiAccessSettings(userId: string) {
  const rawValue = window.localStorage.getItem(settingsStorageKey(userId))

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as AiAccessSettings
  } catch {
    return null
  }
}

function cacheAiAccessSettings(userId: string, settings: AiAccessSettings) {
  window.localStorage.setItem(settingsStorageKey(userId), JSON.stringify(settings))
}

function readDemoEvents(userId: string) {
  const rawValue = window.localStorage.getItem(eventsStorageKey(userId))

  if (!rawValue) {
    return []
  }

  try {
    return JSON.parse(rawValue) as AiGenerationEvent[]
  } catch {
    return []
  }
}

function mapSettingsRow(row: AiSettingsRow): AiAccessSettings {
  return {
    userId: row.user_id,
    planTier: row.plan_tier,
    byokProvider: row.byok_provider,
    preferredModel: row.preferred_model,
    showContinueToSiteButton: row.show_continue_to_site_button ?? true,
    redirectBackMode: row.redirect_back_mode ?? 'manual',
    redirectBackCardCount: row.redirect_back_card_count ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEventRow(row: AiGenerationEventRow): AiGenerationEvent {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    planTier: row.plan_tier,
    provider: row.provider,
    model: row.model,
    cardCount: row.card_count,
    status: row.status,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
    usedByok: row.used_byok,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  }
}

async function callManageByokCredentials<T>(method: 'GET' | 'POST' | 'DELETE', body?: unknown) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured.')
  }

  async function resolveAccessToken() {
    const {
      data: { session: existingSession },
    } = await client.auth.getSession()

    if (existingSession?.access_token) {
      return existingSession.access_token
    }

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await client.auth.refreshSession()

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error('You must be signed in to manage your BYOK key.')
    }

    return refreshedSession.access_token
  }

  async function performRequest(accessToken: string) {
    return fetch(`${env.supabaseUrl}/functions/v1/manage-byok-credentials`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: env.supabaseAnonKey!,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }

  let accessToken = await resolveAccessToken()
  let response = await performRequest(accessToken)

  if (response.status === 401) {
    accessToken = await resolveAccessToken()
    response = await performRequest(accessToken)
  }

  if (response.status === 204) {
    return null as T
  }

  const rawPayload = await response.text()
  const payload = rawPayload
    ? ((JSON.parse(rawPayload) as ByokCredentialPayload & { error?: string }) ?? undefined)
    : undefined

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to manage your BYOK key.')
  }

  return payload as T
}

export async function getAiAccessSettings(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return readDemoSettings(userId)
  }

  const { data, error } = await client
    .from('user_ai_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const fallback: AiAccessSettings = {
      userId,
      planTier: 'free',
      byokProvider: 'openrouter',
      preferredModel: 'gpt-4.1-mini',
      showContinueToSiteButton: true,
      redirectBackMode: 'manual',
      redirectBackCardCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    cacheAiAccessSettings(userId, fallback)
    return fallback
  }
  const settings = mapSettingsRow(data as AiSettingsRow)
  cacheAiAccessSettings(userId, settings)
  return settings
}

export async function saveAiAccessSettings(
  userId: string,
  input: Pick<
    AiAccessSettings,
    | 'planTier'
    | 'byokProvider'
    | 'preferredModel'
    | 'showContinueToSiteButton'
    | 'redirectBackMode'
    | 'redirectBackCardCount'
  >,
) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    const current = readDemoSettings(userId)
    const nextSettings: AiAccessSettings = {
      ...current,
      ...input,
      userId,
      updatedAt: new Date().toISOString(),
    }
    writeDemoSettings(userId, nextSettings)
    return nextSettings
  }

  const { data, error } = await client
    .from('user_ai_settings')
    .upsert({
      user_id: userId,
      plan_tier: input.planTier,
      byok_provider: input.byokProvider,
      preferred_model: input.preferredModel,
      show_continue_to_site_button: input.showContinueToSiteButton,
      redirect_back_mode: input.redirectBackMode,
      redirect_back_card_count: input.redirectBackCardCount,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single()

  if (error) {
    throw new Error(formatAiSettingsError(error))
  }
  const settings = mapSettingsRow(data as AiSettingsRow)
  cacheAiAccessSettings(userId, settings)
  return settings
}

export async function listAiGenerationEvents(userId: string) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return readDemoEvents(userId).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }

  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { data, error } = await client
    .from('ai_generation_events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => mapEventRow(item as AiGenerationEventRow))
}

export async function getStoredByokCredentialStatus(): Promise<ByokCredentialStatus | null> {
  const payload = await callManageByokCredentials<ByokCredentialPayload>('GET')
  return payload?.credential ?? null
}

export async function saveStoredByokCredential(input: {
  provider: 'openai' | 'openrouter'
  apiKey: string
}): Promise<ByokCredentialStatus | null> {
  const payload = await callManageByokCredentials<ByokCredentialPayload>('POST', input)
  return payload?.credential ?? null
}

export async function deleteStoredByokCredential() {
  await callManageByokCredentials<null>('DELETE')
}
