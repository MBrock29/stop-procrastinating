import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { evaluateCards, summarizeResults } from './lib/card-evaluation.mjs'

const live = process.argv.includes('--live')
const fixtures = JSON.parse(await readFile(new URL(live ? '../evals/live-card-generation-cases.json' : '../evals/card-generation-cases.json', import.meta.url), 'utf8'))
const results = []
const startedAt = new Date().toISOString()
if (live && (!process.env.SUPABASE_FUNCTION_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_ACCESS_TOKEN)) {
  throw new Error('Live evals require SUPABASE_FUNCTION_URL, SUPABASE_ANON_KEY and SUPABASE_ACCESS_TOKEN.')
}
for (const fixture of fixtures) {
  const started = performance.now()
  try {
    let payload = fixture.payload
    if (live) {
      // The real endpoint enforces cooldown, quotas and duplicate prevention.
      if (results.length) await new Promise(resolve => setTimeout(resolve, 10_100))
      const response = await fetch(process.env.SUPABASE_FUNCTION_URL, {
        method: 'POST', signal: AbortSignal.timeout(60_000),
        headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
        body: JSON.stringify({ topic: fixture.topic, cardCount: fixture.cardCount, requestedModel: process.env.EVAL_MODEL }),
      })
      payload = await response.json()
      if (!response.ok) throw new Error(`Generation HTTP ${response.status}`)
    }
    const result = evaluateCards(fixture, payload)
    // Negative fixtures are expected to be rejected in offline evaluator tests.
    const passed = live ? result.passed : result.passed === fixture.expectedPass
    results.push({ ...result, passed, outputPassed: result.passed, score: live ? result.score : passed ? 100 : 0,
      latencyMs: Math.round(performance.now() - started),
      model: payload?.meta?.model ?? null, provider: payload?.meta?.provider ?? null,
      promptVersion: payload?.meta?.promptVersion ?? null,
      inputTokens: payload?.meta?.inputTokens ?? null, outputTokens: payload?.meta?.outputTokens ?? null,
      estimatedCostUsd: payload?.meta?.estimatedCostUsd ?? null })
  } catch {
    results.push({ caseId: fixture.id, passed: false, score: 0, error: 'Generation request failed',
      latencyMs: Math.round(performance.now() - started), estimatedCostUsd: null })
  }
}
const report = { suite: 'card-generation-v1', mode: live ? 'live-model' : 'offline-evaluator', startedAt,
  completedAt: new Date().toISOString(), ...summarizeResults(results), results }
await mkdir('evals/results', { recursive: true })
await writeFile(`evals/results/${live ? 'live' : 'offline'}-latest.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ ...report, results: undefined }, null, 2))
process.exitCode = report.passedCount === report.caseCount ? 0 : 1
