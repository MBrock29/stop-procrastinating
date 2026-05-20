import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import type { LearningBriefKind } from '../../types/domain'

export interface GenerateLearningBriefInput {
  topic: string
  kind: LearningBriefKind
}

export interface GenerateLearningBriefResult {
  title: string
  content: string
  meta: {
    model: string
    kind: LearningBriefKind
  }
}

function createLocalBrief(input: GenerateLearningBriefInput) {
  return {
    title:
      input.kind === 'summary'
        ? `${input.topic} summary`
        : `${input.topic} briefing`,
    content:
      input.kind === 'summary'
        ? `This is a short summary for ${input.topic}. Focus on the main concepts, one practical use case, and one common pitfall to watch for.`
        : `This is a weekly-style briefing for ${input.topic}. Highlight what matters, why it matters, and what to pay attention to next.`,
    meta: {
      model: env.openaiModel,
      kind: input.kind,
    },
  } satisfies GenerateLearningBriefResult
}

export async function generateLearningBrief(input: GenerateLearningBriefInput) {
  if (!hasSupabaseEnv) {
    return createLocalBrief(input)
  }

  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured.')
  }

  const {
    data: { session },
  } = await client.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You must be signed in to generate summaries.')
  }

  const response = await fetch(
    `${env.supabaseUrl}/functions/v1/generate-learning-brief`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey!,
      },
      body: JSON.stringify(input),
    },
  )

  const payload = (await response.json()) as
    | { title?: string; content?: string; meta?: GenerateLearningBriefResult['meta']; error?: string }
    | undefined

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to generate a learning brief right now.')
  }

  if (!payload?.title || !payload.content) {
    throw new Error('The generator returned an incomplete brief.')
  }

  return {
    title: payload.title,
    content: payload.content,
    meta: payload.meta ?? {
      model: env.openaiModel,
      kind: input.kind,
    },
  } satisfies GenerateLearningBriefResult
}
