import { describe, expect, it } from 'vitest'
import { evaluateCards, summarizeResults } from '../../../scripts/lib/card-evaluation.mjs'
import fixtures from '../../../evals/card-generation-cases.json'

describe('card evaluation regression fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.id, () => {
      expect(evaluateCards(fixture, fixture.payload).passed).toBe(fixture.expectedPass)
    })
  }
  it('does not turn missing cost data into zero cost', () => {
    expect(summarizeResults([{ passed: true, score: 100 }]).totalEstimatedCostUsd).toBeNull()
  })
})
