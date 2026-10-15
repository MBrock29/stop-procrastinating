import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { 'Content-Type': 'application/json' } })

type Job = { id: string; user_id: string; job_type: 'cards' | 'grounded_cards' | 'brief';
  payload: Record<string, unknown>; attempt_count: number; max_attempts: number;
  locked_by: string; lock_token: string }

async function invokeGeneration(url: string, serviceKey: string, workerSecret: string, job: Job) {
  const endpoint = job.job_type === 'cards' ? 'generate-learning-cards'
    : job.job_type === 'grounded_cards' ? 'generate-grounded-learning-cards' : 'generate-learning-brief'
  const body = { ...job.payload, generationBatchId: job.id }
  const response = await fetch(`${url}/functions/v1/${endpoint}`, {
    method: 'POST', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json',
      'x-generation-worker-secret': workerSecret, 'x-generation-user-id': job.user_id },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Generation returned HTTP ${response.status}.`)
  return payload
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const url = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const workerSecret = Deno.env.get('GENERATION_WORKER_SECRET')
  if (!url || !serviceKey || !workerSecret) return json({ error: 'Generation worker is not configured.' }, 500)
  if (request.headers.get('x-worker-secret') !== workerSecret) return json({ error: 'Unauthorized.' }, 401)
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const workerId = `generation-${crypto.randomUUID()}`
  const recovered = await service.rpc('recover_stale_ai_generation_jobs', { p_stale_after: '10 minutes' })
  if (recovered.error) return json({ error: `Unable to recover stale jobs: ${recovered.error.message}` }, 500)
  const claimed = await service.rpc('claim_next_ai_generation_job', { p_worker_id: workerId })
  if (claimed.error) return json({ error: `Unable to claim a job: ${claimed.error.message}` }, 500)
  const claimedValue = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data
  const job = claimedValue as Job | null
  if (!job?.id) return json({ processed: false, recovered: recovered.data ?? 0, reason: 'queue_empty' })

  try {
    let result: Record<string, unknown>
    if (job.job_type === 'brief') {
      const existing = await service.from('learning_briefs').select('id,title,content,kind')
        .eq('user_id', job.user_id).eq('generation_batch_id', job.id).maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) result = { brief: existing.data, recoveredArtifact: true }
      else {
        const generated = await invokeGeneration(url, serviceKey, workerSecret, job)
        const inserted = await service.from('learning_briefs').insert({ user_id: job.user_id,
          generation_batch_id: job.id, topic: job.payload.topic, title: generated.title,
          content: generated.content, kind: 'summary' }).select('id,title,content,kind').single()
        if (inserted.error) throw inserted.error
        result = { brief: inserted.data, meta: generated.meta }
      }
    } else if (job.job_type === 'cards') {
      const existing = await service.from('learning_cards').select('id,question,answer')
        .eq('user_id', job.user_id).eq('generation_batch_id', job.id)
      if (existing.error) throw existing.error
      if (existing.data?.length) result = { cards: existing.data, recoveredArtifact: true }
      else {
        const generated = await invokeGeneration(url, serviceKey, workerSecret, job)
        const rows = (generated.cards ?? []).map((card: { question: string; answer: string }) => ({
          user_id: job.user_id, generation_batch_id: job.id, generation_topic: job.payload.topic,
          source: 'ai', is_user_edited: false, question: card.question, answer: card.answer }))
        if (!rows.length) throw new Error('Generation returned no cards.')
        const inserted = await service.from('learning_cards').insert(rows).select('id,question,answer')
        if (inserted.error) throw inserted.error
        result = { cards: inserted.data, meta: generated.meta }
      }
    } else {
      const existing = await service.from('learning_cards').select('id,question,answer,grounded_source_id')
        .eq('user_id', job.user_id).eq('generation_batch_id', job.id)
      if (existing.error) throw existing.error
      result = existing.data?.length ? { cards: existing.data, recoveredArtifact: true }
        : await invokeGeneration(url, serviceKey, workerSecret, job)
    }
    const completed = await service.rpc('complete_ai_generation_job', { p_job_id: job.id,
      p_worker_id: workerId, p_lock_token: job.lock_token, p_result: result })
    if (completed.error) throw completed.error
    if (!completed.data) return json({ processed: false, jobId: job.id, reason: 'lock_lost' }, 409)
    return json({ processed: true, jobId: job.id, status: 'succeeded', recovered: recovered.data ?? 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation worker failed.'
    const failed = await service.rpc('fail_ai_generation_job', { p_job_id: job.id,
      p_worker_id: workerId, p_lock_token: job.lock_token, p_error_message: message })
    if (failed.error) return json({ error: `Worker failed and could not persist failure: ${failed.error.message}` }, 500)
    return json({ processed: true, jobId: job.id, status: failed.data, error: message }, 500)
  }
})
