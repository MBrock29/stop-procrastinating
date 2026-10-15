import { useEffect, useState } from 'react'
import { getAiOpsSummary } from '../features/ai-ops/aiOpsRepository'
import type { AiOpsSummary } from '../features/ai-ops/aiOpsMetrics'
import { useAuth } from '../features/auth/useAuth'

export function AiOpsPage() {
  const { user, mode } = useAuth()
  const [summary, setSummary] = useState<AiOpsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!user) return
    void getAiOpsSummary(user.id).then(value => { if (!cancelled) setSummary(value) })
      .catch(() => { if (!cancelled) setError('Unable to load AI operations metrics.') })
    return () => { cancelled = true }
  }, [user])
  const metrics: Array<[string, string | number]> = summary ? [
    ['Generation requests', summary.requests], ['Success rate', `${summary.successRate}%`],
    ['Generation failures', summary.failures], ['Policy rejections', summary.rejected],
    ['Average latency', summary.averageLatencyMs == null ? 'Unknown' : `${summary.averageLatencyMs} ms`],
    ['p95 latency', summary.p95LatencyMs == null ? 'Unknown' : `${summary.p95LatencyMs} ms`],
    ['Input tokens', summary.inputTokens.toLocaleString()], ['Output tokens', summary.outputTokens.toLocaleString()],
    ['Estimated cost', summary.estimatedCostUsd == null ? 'Unknown' : `$${summary.estimatedCostUsd.toFixed(6)}`],
    ['Cost coverage', `${summary.costCoverage}%`], ['Tutor runs', summary.tutorRuns],
    ['Tutor successes', summary.tutorSuccesses], ['Tutor tool calls', summary.tutorToolCalls],
    ['Grounded runs', summary.groundedRuns], ['Grounded successes', summary.groundedSuccesses],
    ['Grounding smoke pass', summary.groundingPassRate == null ? 'Unknown' : `${summary.groundingPassRate}%`],
    ['Latest eval score', summary.latestEvalScore == null ? 'No published run' : `${summary.latestEvalScore}%`],
  ] : []
  return <section className="space-y-6">
    <div className="panel px-6 py-6 sm:px-8"><p className="section-kicker">AI operations</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">AI health over the last 30 days</h2><p className="muted-copy mt-2 max-w-3xl text-sm sm:text-base">Generation reliability, latency, tokens, known cost coverage, tutor activity and the latest published live eval.</p>{mode === 'demo' ? <p className="muted-copy mt-2 text-xs">Demo metrics use events stored in this browser.</p> : null}</div>
    {error ? <div role="alert" className="panel border border-red-300 px-6 py-5 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
    {!summary && !error ? <div role="status" className="panel px-6 py-5 text-sm">Loading AI operations metrics…</div> : null}
    {summary ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="panel px-5 py-5"><div className="muted-copy text-xs font-semibold uppercase tracking-wide">{label}</div><div className="mt-2 text-2xl font-extrabold">{value}</div></div>)}</div> : null}
    {summary && summary.requests === 0 && summary.tutorRuns === 0 ? <div className="panel px-6 py-5 text-sm"><p className="font-semibold">No AI activity in this window.</p><p className="muted-copy mt-2">Generate a card pack or tutor session to populate operational telemetry.</p></div> : null}
  </section>
}
