import { describe, expect, it } from 'vitest'
import { chunkSourceText, lexicalGroundingScore, normalizeSourceText, validateCitationIndexes } from '../../../supabase/functions/_shared/ragUtils.mjs'

describe('RAG utilities', () => {
  it('normalizes whitespace and preserves non-Latin text', () => {
    expect(normalizeSourceText('缓存  \r\n\r\n\r\n策略')).toBe('缓存\n\n策略')
  })
  it('creates overlap without losing the tail', () => {
    const text = Array.from({ length: 60 }, (_, index) => `Sentence ${index + 1} contains useful context.`).join(' ')
    const chunks = chunkSourceText(text, 300, 50)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.at(-1)).toContain('Sentence 60')
  })
  it('rejects unsafe chunk settings', () => {
    expect(() => chunkSourceText('text', 100, 100)).toThrow()
    expect(() => chunkSourceText('text', 0, 0)).toThrow()
  })
  it('requires one to three valid citation indexes', () => {
    expect(validateCitationIndexes([1, 1, 2], 3)).toEqual([1, 2])
    expect(() => validateCitationIndexes([], 3)).toThrow()
    expect(() => validateCitationIndexes([4], 3)).toThrow()
  })
  it('uses Unicode-aware overlap as a smoke signal', () => {
    expect(lexicalGroundingScore('缓存策略避免重复请求', ['缓存策略可以避免重复请求'])).toBeGreaterThan(0)
    expect(lexicalGroundingScore('database replication', ['React effect cleanup'])).toBe(0)
  })
})
