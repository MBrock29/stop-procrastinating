import { describe, expect, it } from 'vitest'
import { extractTutorText, getToolCalls, parseToolArguments, parseTutorRecommendation } from '../../../supabase/functions/_shared/tutorRuntime.mjs'

describe('adaptive tutor runtime contract', () => {
  it('validates tool names, limits and exact argument shape', () => {
    expect(parseToolArguments('{"limit":10}', 'get_due_cards')).toEqual({ limit: 10 })
    expect(() => parseToolArguments('{"limit":31}', 'get_due_cards')).toThrow()
    expect(() => parseToolArguments('{"limit":10,"userId":"other"}', 'get_due_cards')).toThrow()
    expect(() => parseToolArguments('{}', 'unknown')).toThrow()
  })
  it('rejects malformed calls and extracts raw response text', () => {
    expect(getToolCalls({ output: [{ type: 'function_call', name: 'get_topic_mastery', arguments: '{"limit":5}', call_id: '1' }] })).toHaveLength(1)
    expect(() => getToolCalls({ output: [{ type: 'function_call', name: 'get_topic_mastery' }] })).toThrow()
    expect(extractTutorText({ output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }] })).toBe('{"ok":true}')
  })
  it('accepts only the structured recommendation contract', () => {
    const valid = { headline: 'Review React', focusTopic: 'react', reason: 'Lowest confidence.',
      actions: ['Review three cards.'], estimatedMinutes: 10, confidence: 'high' }
    expect(parseTutorRecommendation(JSON.stringify(valid))).toEqual(valid)
    expect(() => parseTutorRecommendation(JSON.stringify({ ...valid, invented: true }))).toThrow()
    expect(() => parseTutorRecommendation(JSON.stringify({ ...valid, actions: [] }))).toThrow()
  })
})
