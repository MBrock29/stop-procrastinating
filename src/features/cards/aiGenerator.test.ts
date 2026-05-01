import { describe, expect, it } from 'vitest'
import { generateCardsWithAi } from './aiGenerator'

describe('generateCardsWithAi demo mode', () => {
  it('returns the requested number of local fallback cards when Supabase is absent', async () => {
    const cards = await generateCardsWithAi({
      topic: 'mid-senior React interview questions',
      seniority: 'mid-senior',
      cardCount: 3,
    })

    expect(cards).toHaveLength(3)
    expect(cards[0]?.question).toContain('mid-senior')
    expect(cards[0]?.question).toContain('mid-senior React interview questions')
  })
})
