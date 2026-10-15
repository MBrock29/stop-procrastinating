import { describe, expect, it } from 'vitest'
import { getGenerationPolicy, getRetryDelaySeconds, makeIdempotencyKey,
  sanitizeGenerationPayload } from '../../../supabase/functions/_shared/generationPolicy.mjs'

describe('generation job policy', () => {
  it('sanitizes payloads and drops untrusted fields', () => {
    const payload = sanitizeGenerationPayload('cards', { topic: '  Caching ', cardCount: 8,
      access_token: 'must-not-survive', extra: true }, getGenerationPolicy('pro'))
    expect(payload).toEqual({ topic: 'Caching', cardCount: 8 })
  })
  it('enforces grounded entitlement, source IDs, and count limits', () => {
    expect(() => sanitizeGenerationPayload('grounded_cards', { topic: 'RAG', cardCount: 5,
      sourceId: crypto.randomUUID() }, getGenerationPolicy('free'))).toThrow('not enabled')
    expect(() => sanitizeGenerationPayload('grounded_cards', { topic: 'RAG', cardCount: 21,
      sourceId: crypto.randomUUID() }, getGenerationPolicy('premium'))).toThrow('20-card limit')
    expect(sanitizeGenerationPayload('grounded_cards', { topic: 'RAG', cardCount: 5,
      sourceId: '00000000-0000-4000-8000-000000000001' }, getGenerationPolicy('premium')))
      .toEqual({ topic: 'RAG', cardCount: 5, sourceId: '00000000-0000-4000-8000-000000000001' })
  })
  it('bounds retries and creates stable keys for the same bucket', () => {
    expect([1, 2, 3, 4, 8].map(getRetryDelaySeconds)).toEqual([10, 20, 40, 80, 300])
    const input = { jobType: 'cards', payload: { topic: 'Caching', cardCount: 5 }, bucket: '2026-10-15T12' }
    expect(makeIdempotencyKey(input)).toBe(makeIdempotencyKey(input))
  })
})
