import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite({ extensions: { vector } })
const owner = '00000000-0000-4000-8000-000000000031'
const other = '00000000-0000-4000-8000-000000000032'
const source = '00000000-0000-4000-8000-000000000033'
const card = '00000000-0000-4000-8000-000000000034'
async function migration(name: string) {
  await db.exec(await readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'))
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');`)
  for (const name of ['20260501120000_create_learning_cards','20260502110000_add_ai_metadata_to_learning_cards',
    '20260516123000_add_generation_batch_id_to_learning_cards','20261015220000_grounded_learning_sources',
    '20261015223000_feedback_and_generation_jobs']) await migration(name)
  await db.query(`insert into learning_sources(id,user_id,title,source_type,content_hash,status,embedding_model)
    values($1,$2,'Source','text',$3,'ready','embed')`, [source, owner, 'a'.repeat(64)])
  await db.query(`insert into learning_cards(id,user_id,question,answer,source)
    values($1,$2,'Question','Answer','ai')`, [card, owner])
}, 30_000)
afterAll(async () => { await db.close() })

describe('feedback ownership', () => {
  it('allows owner feedback and rejects cross-owner card or source links', async () => {
    await db.query(`insert into ai_card_feedback(user_id,card_id,source_id,feedback_type)
      values($1,$2,$3,'useful')`, [owner, card, source])
    await expect(db.query(`insert into ai_card_feedback(user_id,card_id,feedback_type)
      values($1,$2,'incorrect')`, [other, card])).rejects.toThrow()
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`)
      expect((await db.query('select * from ai_card_feedback')).rows).toHaveLength(0)
      await expect(db.query(`insert into ai_card_feedback(user_id,card_id,feedback_type)
        values($1,$2,'useful')`, [owner, card])).rejects.toThrow()
    } finally { await db.exec('reset role') }
  })
})

describe('generation queue', () => {
  it('reuses the persisted grounded batch and returns its real card IDs on retry', async () => {
    const batch = '00000000-0000-4000-8000-000000000035'
    const savedCard = '00000000-0000-4000-8000-000000000036'
    const event = { request_id: crypto.randomUUID(), user_id: owner, source_id: source,
      generation_batch_id: batch, topic: 'Caching', model: 'gpt-5-mini', embedding_model: 'embed',
      prompt_version: 'grounded-cards-v1', retrieved_chunk_ids: [], retrieved_similarities: [],
      grounding_pass_rate: 100, latency_ms: 10, input_tokens: 1, output_tokens: 2,
      estimated_cost_usd: null }
    const cards = [{ id: savedCard, question: 'What is cached?', answer: 'A reusable result.',
      citation_chunk_ids: [], citation_excerpts: [], grounding_score: 100 }]
    const first = await db.query<{ persist_grounded_generation: string[] }>(
      `select public.persist_grounded_generation($1::jsonb,$2::jsonb)`,
      [JSON.stringify(event), JSON.stringify(cards)])
    const retry = await db.query<{ persist_grounded_generation: string[] }>(
      `select public.persist_grounded_generation($1::jsonb,$2::jsonb)`,
      [JSON.stringify({ ...event, request_id: crypto.randomUUID() }), JSON.stringify([
        { ...cards[0], id: crypto.randomUUID(), question: 'A different retry output' }])])
    expect(first.rows[0].persist_grounded_generation).toEqual([savedCard])
    expect(retry.rows[0].persist_grounded_generation).toEqual([savedCard])
    expect((await db.query('select * from learning_cards where generation_batch_id=$1', [batch])).rows).toHaveLength(1)
  })
  it('deduplicates jobs and prevents browser writes or credential payloads', async () => {
    await db.query(`insert into ai_generation_jobs(user_id,idempotency_key,job_type,payload)
      values($1,'cards:stable-key','cards','{"topic":"Caching","cardCount":5}')`, [owner])
    await expect(db.query(`insert into ai_generation_jobs(user_id,idempotency_key,job_type,payload)
      values($1,'cards:stable-key','cards','{"topic":"Other","cardCount":5}')`, [owner])).rejects.toThrow()
    await expect(db.query(`insert into ai_generation_jobs(user_id,idempotency_key,job_type,payload)
      values($1,'cards:secret-key','cards','{"topic":"Caching","access_token":"secret"}')`, [owner])).rejects.toThrow()
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`)
      expect((await db.query('select * from ai_generation_jobs')).rows).toHaveLength(1)
      await expect(db.query(`insert into ai_generation_jobs(user_id,idempotency_key,job_type,payload)
        values($1,'cards:browser-key','cards','{"topic":"Caching"}')`, [owner])).rejects.toThrow('permission denied')
      await expect(db.query(`select public.claim_next_ai_generation_job('browser-worker')`)).rejects.toThrow('permission denied')
    } finally { await db.exec('reset role') }
  })
  it('claims once, fences stale workers, retries, and dead-letters at the limit', async () => {
    const claimed = await db.query<{ id: string; lock_token: string }>(
      `select * from public.claim_next_ai_generation_job('worker-one')`)
    expect(claimed.rows).toHaveLength(1)
    const job = claimed.rows[0]
    expect((await db.query(`select * from public.claim_next_ai_generation_job('worker-two')`)).rows[0].id).toBeNull()
    expect((await db.query<{ complete_ai_generation_job: boolean }>(
      `select public.complete_ai_generation_job($1,'worker-two',$2,'{}')`, [job.id, job.lock_token])).rows[0]
      .complete_ai_generation_job).toBe(false)
    expect((await db.query<{ fail_ai_generation_job: string }>(
      `select public.fail_ai_generation_job($1,'worker-one',$2,'temporary')`, [job.id, job.lock_token])).rows[0]
      .fail_ai_generation_job).toBe('failed')
    await db.query(`update ai_generation_jobs set next_attempt_at=now(), attempt_count=max_attempts-1 where id=$1`, [job.id])
    const last = (await db.query<{ lock_token: string }>(`select * from public.claim_next_ai_generation_job('worker-three')`)).rows[0]
    expect((await db.query<{ fail_ai_generation_job: string }>(
      `select public.fail_ai_generation_job($1,'worker-three',$2,'final')`, [job.id, last.lock_token])).rows[0]
      .fail_ai_generation_job).toBe('dead_letter')
  })
  it('recovers expired locks and invalidates the old fence token', async () => {
    const id = crypto.randomUUID()
    await db.query(`insert into ai_generation_jobs(id,user_id,idempotency_key,job_type,payload)
      values($1,$2,'cards:stale-key','cards','{"topic":"Stale"}')`, [id, owner])
    const claimed = (await db.query<{ lock_token: string }>(
      `select * from public.claim_next_ai_generation_job('stale-worker')`)).rows[0]
    await db.query(`update ai_generation_jobs set locked_at=now()-interval '20 minutes' where id=$1`, [id])
    expect((await db.query<{ recover_stale_ai_generation_jobs: number }>(
      `select public.recover_stale_ai_generation_jobs(interval '10 minutes')`)).rows[0]
      .recover_stale_ai_generation_jobs).toBe(1)
    expect((await db.query<{ complete_ai_generation_job: boolean }>(
      `select public.complete_ai_generation_job($1,'stale-worker',$2,'{}')`, [id, claimed.lock_token])).rows[0]
      .complete_ai_generation_job).toBe(false)
  })
})
