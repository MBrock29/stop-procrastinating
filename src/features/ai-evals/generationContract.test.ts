import { describe, expect, it } from 'vitest'
import { extractResponseText, normalizeQuestion, parseGeneratedCards } from '../../../supabase/functions/_shared/cardGeneration.mjs'

describe('generation response contract', () => {
  it('reads raw Responses output messages and ignores reasoning items', () => {
    expect(extractResponseText({ output: [
      { type: 'reasoning', summary: [] },
      { type: 'message', content: [{ type: 'output_text', text: '{"cards":' }, { type: 'output_text', text: '[]}' }] },
    ] })).toBe('{"cards":[]}')
  })
  it('rejects incomplete model output', () => {
    expect(() => extractResponseText({ status: 'incomplete', output_text: '{"cards":[]}' })).toThrow()
  })
  it('does not treat refusals as card content', () => {
    expect(extractResponseText({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Cannot help.' }] }] })).toBe('')
  })
  it('validates the whole pack rather than silently dropping malformed cards', () => {
    expect(() => parseGeneratedCards({ cards: [{ question: 'Valid?', answer: 'Yes.' }, null] })).toThrow()
    expect(parseGeneratedCards({ cards: [{ question: ' Valid? ', answer: ' Yes. ' }] })).toEqual([{ question: 'Valid?', answer: 'Yes.' }])
  })
  it('preserves non-Latin questions and normalizes compatible Unicode forms', () => {
    expect(normalizeQuestion('如何缓存？')).toBe('如何缓存')
    expect(normalizeQuestion('Ｃａｃｈｅ!')).toBe('cache')
  })
})
