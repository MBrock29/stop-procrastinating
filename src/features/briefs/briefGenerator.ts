import { env, hasSupabaseEnv } from '../../lib/env'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export interface GenerateLearningBriefInput {
  topic: string
  cards: Array<{
    question: string
    answer: string
  }>
}

export interface GenerateLearningBriefResult {
  title: string
  content: string
  meta: {
    model: string
    kind: 'summary'
  }
}

function createLocalBrief(input: GenerateLearningBriefInput) {
  const exampleCards = input.cards
    .slice(0, 3)
    .map((card) => `- ${card.question}: ${card.answer}`)
    .join('\n')

  return {
    title: `${input.topic} summary`,
    content: `This pack on ${input.topic} covers the core ideas, practical patterns, and common trade-offs you should remember. Review the recurring themes, connect similar questions together, and keep the main pitfalls in mind before your next session.\n\nExample recap points:\n${exampleCards}`,
    meta: {
      model: env.openaiModel,
      kind: 'summary',
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
      kind: 'summary',
    },
  } satisfies GenerateLearningBriefResult
}
