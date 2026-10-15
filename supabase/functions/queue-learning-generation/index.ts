import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGenerationPolicy, makeIdempotencyKey, sanitizeGenerationPayload } from '../_shared/generationPolicy.mjs'

const corsHeaders = { 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const ownerEmails = new Set(['mbrock19@gmail.com'])

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return json({ error: 'Generation queue is not configured.' }, 500)
  const auth = request.headers.get('Authorization')
  if (!auth) return json({ error: 'Missing authorization header.' }, 401)
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } })
  const service = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unable to validate the current user.' }, 401)
  try {
    const body = await request.json()
    const jobType = typeof body?.jobType === 'string' ? body.jobType : ''
    const { data: settings, error: settingsError } = await service.from('user_ai_settings')
      .select('plan_tier').eq('user_id', user.id).maybeSingle()
    if (settingsError) throw new Error('Unable to validate generation access.')
    const policy = getGenerationPolicy(settings?.plan_tier ?? 'free',
      Boolean(user.email && ownerEmails.has(user.email.toLowerCase())))
    const payload = sanitizeGenerationPayload(jobType, body?.payload, policy)
    if (jobType === 'grounded_cards') {
      const { data: source, error } = await service.from('learning_sources').select('id,status')
        .eq('id', payload.sourceId).eq('user_id', user.id).maybeSingle()
      if (error) throw error
      if (!source) return json({ error: 'Source not found.' }, 404)
      if (source.status !== 'ready') return json({ error: 'Source is not ready.' }, 409)
    }
    const idempotencyKey = typeof body?.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim() : makeIdempotencyKey({ jobType, payload })
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      return json({ error: 'Idempotency key must be 8–200 characters.' }, 400)
    }
    const { data: existing, error: existingError } = await service.from('ai_generation_jobs')
      .select('*').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existingError) throw existingError
    if (existing) return json({ job: existing, reused: true })
    const { data: job, error } = await service.from('ai_generation_jobs').insert({ user_id: user.id,
      idempotency_key: idempotencyKey, job_type: jobType, payload, max_attempts: policy.maxAttempts })
      .select('*').single()
    if (error?.code === '23505') {
      const retry = await service.from('ai_generation_jobs').select('*').eq('user_id', user.id)
        .eq('idempotency_key', idempotencyKey).single()
      if (retry.error) throw retry.error
      return json({ job: retry.data, reused: true })
    }
    if (error) throw error
    return json({ job, reused: false }, 202)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to queue generation.' }, 400)
  }
})
