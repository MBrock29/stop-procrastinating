import { describe, expect, it } from 'vitest'
import type { AiGenerationEvent, TutorRun } from '../../types/domain'
import { buildAiOpsSummary } from './aiOpsMetrics'

describe('AI operations metrics', () => {
  it('separates failures from policy rejections and reports cost coverage', () => {
    const events = [
      { status: 'success', latencyMs: 100, inputTokens: 10, outputTokens: 5, estimatedCostUsd: 0.01 },
      { status: 'failed', latencyMs: 300, inputTokens: null, outputTokens: null, estimatedCostUsd: null },
      { status: 'rate_limited', latencyMs: 200, inputTokens: null, outputTokens: null, estimatedCostUsd: null },
    ] as AiGenerationEvent[]
    const runs = [{ status: 'success', toolCount: 3, inputTokens: 20, outputTokens: 10,
      estimatedCostUsd: 0.02 }] as TutorRun[]
    expect(buildAiOpsSummary(events, runs, 92, [{ status: 'success', groundingPassRate: 80 }])).toMatchObject({ requests: 3, successes: 1,
      failures: 1, rejected: 1, successRate: 33.3, averageLatencyMs: 200, p95LatencyMs: 300,
      inputTokens: 30, outputTokens: 15, estimatedCostUsd: 0.03, costCoverage: 50,
      tutorRuns: 1, tutorSuccesses: 1, tutorToolCalls: 3, latestEvalScore: 92,
      groundedRuns: 1, groundedSuccesses: 1, groundingPassRate: 80 })
  })
  it('keeps cost and latency unknown when telemetry is absent', () => {
    expect(buildAiOpsSummary([], [], null)).toMatchObject({ estimatedCostUsd: null,
      costCoverage: 0, averageLatencyMs: null, p95LatencyMs: null })
  })
})
