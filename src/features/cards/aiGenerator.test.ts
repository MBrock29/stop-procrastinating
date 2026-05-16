import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()

vi.mock('../../lib/env', () => ({
  env: {
    appUrl: 'http://localhost:5173',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
    openaiModel: 'gpt-4.1-mini',
  },
  hasSupabaseEnv: false,
}))

vi.mock('../../lib/supabase', () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      getSession,
    },
  })),
}))

describe('generateCardsWithAi demo mode', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('returns the requested number of local fallback cards when Supabase is absent', async () => {
    const { generateCardsWithAi } = await import('./aiGenerator')

    const result = await generateCardsWithAi({
      topic: 'mid-senior React interview questions',
      cardCount: 3,
    })

    expect(result.cards).toHaveLength(3)
    expect(result.cards[0]?.question).toContain('mid-senior React interview questions')
    expect(result.meta.model).toBe('gpt-4.1-mini')
    expect(getSession).not.toHaveBeenCalled()
  })
})
