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

  it('does not fabricate learning content when Supabase is absent', async () => {
    const { generateCardsWithAi } = await import('./aiGenerator')

    await expect(generateCardsWithAi({
      topic: 'mid-senior React interview questions',
      cardCount: 3,
    })).rejects.toThrow('Personalised generation needs a connected account')
    expect(getSession).not.toHaveBeenCalled()
  })
})
