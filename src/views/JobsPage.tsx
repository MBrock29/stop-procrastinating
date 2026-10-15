import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import { listGenerationJobs, queueCardGeneration, type GenerationJob } from '../features/jobs/jobRepository'

export function JobsPage() {
  const { user, mode } = useAuth(); const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [topic, setTopic] = useState(''); const [cardCount, setCardCount] = useState(10)
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(mode === 'supabase')
  const reload = useCallback(async () => {
    if (user && mode === 'supabase') setJobs(await listGenerationJobs(user.id))
  }, [mode, user])
  useEffect(() => {
    void reload().catch(() => setError('Unable to load generation jobs.')).finally(() => setLoading(false))
    if (mode !== 'supabase') return
    const timer = window.setInterval(() => void reload().catch(() => undefined), 10_000)
    return () => window.clearInterval(timer)
  }, [mode, reload])
  async function queue(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null)
    try {
      const normalized = topic.trim().toLocaleLowerCase()
      const key = `cards:${normalized}:${cardCount}:${new Date().toISOString().slice(0, 13)}`
      const result = await queueCardGeneration({ topic, cardCount, idempotencyKey: key })
      setNotice(result.reused ? 'The matching job already exists.' : 'Generation job queued.')
      await reload()
    } catch (next) { setError(next instanceof Error ? next.message : 'Unable to queue generation.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-6">
    <div className="panel px-6 py-6 sm:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-kicker">Async generation</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Queue longer AI work</h2></div>
      {mode === 'supabase' ? <button type="button" className="ghost-button px-4 py-2 text-sm" onClick={() => void reload()} disabled={loading}>Refresh</button> : null}</div>
      <p className="muted-copy mt-2 max-w-3xl text-sm sm:text-base">Each request has an idempotency key. Workers claim jobs with a fenced lock, retry failures with exponential backoff, and stop at a dead-letter state.</p></div>
    {mode === 'demo' ? <div className="panel px-6 py-5 text-sm">Async jobs require a configured Supabase project.</div> :
      <form onSubmit={queue} className="panel grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_150px_auto] lg:items-end">
        <label className="text-sm font-semibold">Topic<input required maxLength={500} value={topic} onChange={event => setTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3" /></label>
        <label className="text-sm font-semibold">Cards<input type="number" min={1} max={100} value={cardCount} onChange={event => setCardCount(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3" /></label>
        <button disabled={busy} className="action-button h-11 px-5 text-sm">{busy ? 'Queueing…' : 'Queue pack'}</button>
      </form>}
    {error ? <div role="alert" className="panel border border-red-300 px-6 py-5 text-sm text-red-700">{error}</div> : null}
    {notice ? <div role="status" className="panel px-6 py-5 text-sm">{notice}</div> : null}
    <div className="panel overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Job</th><th>Type</th><th>Status</th><th>Attempts</th><th>Created</th><th>Error</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.id} className="border-b last:border-0"><td className="px-5 py-4 font-mono text-xs">{job.id.slice(0, 8)}</td><td>{job.jobType}</td><td className="font-semibold">{job.status}</td><td>{job.attemptCount}/{job.maxAttempts}</td><td>{new Date(job.createdAt).toLocaleString()}</td><td className="max-w-xs truncate text-xs">{job.errorMessage ?? '—'}</td></tr>)}</tbody></table>
      {loading ? <p className="px-5 py-8 text-sm text-slate-500">Loading generation jobs…</p> : null}
      {!loading && !jobs.length ? <p className="px-5 py-8 text-sm text-slate-500">No generation jobs yet.</p> : null}</div>
  </section>
}
