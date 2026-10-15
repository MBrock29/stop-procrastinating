import type { AiGenerationEvent, TutorRun } from '../../types/domain'

export interface AiOpsSummary {
  requests: number
  successes: number
  failures: number
  rejected: number
  successRate: number
  averageLatencyMs: number | null
  p95LatencyMs: number | null
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number | null
  costCoverage: number
  tutorRuns: number
  tutorSuccesses: number
  tutorToolCalls: number
  latestEvalScore: number | null
  groundedRuns: number
  groundedSuccesses: number
  groundingPassRate: number | null
}

export function buildAiOpsSummary(events: AiGenerationEvent[], tutorRuns: TutorRun[],
  latestEvalScore: number | null,
  groundedEvents: Array<{ status: 'success' | 'failed'; groundingPassRate: number | null }> = []): AiOpsSummary {
  const successful = events.filter(event => event.status === 'success').length
  const failed = events.filter(event => event.status === 'failed').length
  const latencies = events.map(event => event.latencyMs).filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b)
  const costs = [...events.map(event => event.estimatedCostUsd), ...tutorRuns.map(run => run.estimatedCostUsd)]
  const knownCosts = costs.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return {
    requests: events.length, successes: successful, failures: failed,
    rejected: events.length - successful - failed,
    successRate: events.length ? Math.round(successful / events.length * 1000) / 10 : 0,
    averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null,
    p95LatencyMs: latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null,
    inputTokens: events.reduce((sum, event) => sum + (event.inputTokens ?? 0), 0) +
      tutorRuns.reduce((sum, run) => sum + (run.inputTokens ?? 0), 0),
    outputTokens: events.reduce((sum, event) => sum + (event.outputTokens ?? 0), 0) +
      tutorRuns.reduce((sum, run) => sum + (run.outputTokens ?? 0), 0),
    estimatedCostUsd: knownCosts.length ? Number(knownCosts.reduce((sum, value) => sum + value, 0).toFixed(6)) : null,
    costCoverage: costs.length ? Math.round(knownCosts.length / costs.length * 100) : 0,
    tutorRuns: tutorRuns.length, tutorSuccesses: tutorRuns.filter(run => run.status === 'success').length,
    tutorToolCalls: tutorRuns.reduce((sum, run) => sum + run.toolCount, 0), latestEvalScore,
    groundedRuns: groundedEvents.length,
    groundedSuccesses: groundedEvents.filter(event => event.status === 'success').length,
    groundingPassRate: groundedEvents.some(event => event.groundingPassRate != null)
      ? Math.round(groundedEvents.reduce((sum, event) => sum + (event.groundingPassRate ?? 0), 0) /
        groundedEvents.filter(event => event.groundingPassRate != null).length * 10) / 10
      : null,
  }
}
