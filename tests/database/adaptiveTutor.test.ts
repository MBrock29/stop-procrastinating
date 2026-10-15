import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const owner = '00000000-0000-0000-0000-000000000011'
const other = '00000000-0000-0000-0000-000000000012'
const run = '00000000-0000-0000-0000-000000000013'

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');`)
  await db.exec(await readFile(new URL('../../supabase/migrations/20261015213000_adaptive_tutor_and_ai_ops.sql', import.meta.url), 'utf8'))
  await db.query(`insert into public.ai_tutor_runs(id,user_id,request_id,model,prompt_version,status,recommendation,tool_count,latency_ms)
    values($1,$2,$3,'gpt-5-mini','adaptive-tutor-v1','success',$4,1,100)`,
    [run, owner, '00000000-0000-0000-0000-000000000014', JSON.stringify({ headline: 'Review' })])
  await db.query(`insert into public.ai_tutor_tool_events(run_id,user_id,sequence,tool_name,arguments,result_summary,status,latency_ms)
    values($1,$2,1,'get_due_cards','{"limit":5}','[]','success',10)`, [run, owner])
}, 30_000)

afterAll(async () => { await db.close() })

describe('adaptive tutor persistence', () => {
  it('enforces run/trace owner consistency and sequence uniqueness', async () => {
    await expect(db.query(`insert into public.ai_tutor_tool_events(run_id,user_id,sequence,tool_name,arguments,result_summary,status,latency_ms)
      values($1,$2,2,'get_due_cards','{"limit":5}','[]','success',10)`, [run, other])).rejects.toThrow()
    await expect(db.query(`insert into public.ai_tutor_tool_events(run_id,user_id,sequence,tool_name,arguments,result_summary,status,latency_ms)
      values($1,$2,1,'get_due_cards','{"limit":5}','[]','success',10)`, [run, owner])).rejects.toThrow()
  })
  it('records a run and its trace atomically through the service-only function', async () => {
    const nextRun = '00000000-0000-0000-0000-000000000015'
    await db.query(`select public.record_ai_tutor_run($1::jsonb, $2::jsonb)`, [
      JSON.stringify({ id: nextRun, user_id: owner, request_id: '00000000-0000-0000-0000-000000000016',
        model: 'gpt-5-mini', prompt_version: 'adaptive-tutor-v1', status: 'failed', recommendation: null,
        tool_count: 1, latency_ms: 50, input_tokens: 10, output_tokens: 0,
        estimated_cost_usd: 0.000003, failure_reason: 'Tool failed' }),
      JSON.stringify([{ sequence: 1, tool_name: 'get_due_cards', arguments: { limit: 5 },
        result_summary: null, status: 'failed', latency_ms: 2, error_message: 'Database unavailable' }]),
    ])
    expect((await db.query(`select * from public.ai_tutor_tool_events where run_id = $1`, [nextRun])).rows).toHaveLength(1)
    await expect(db.query(`select public.record_ai_tutor_run($1::jsonb, $2::jsonb)`, [
      JSON.stringify({ id: crypto.randomUUID(), user_id: owner }), JSON.stringify(Array(9).fill({}))
    ])).rejects.toThrow('Invalid tutor trace')
  })
  it('allows owner reads, hides other owners, and denies browser writes', async () => {
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`)
      expect((await db.query('select * from public.ai_tutor_runs')).rows).toHaveLength(2)
      expect((await db.query('select * from public.ai_tutor_tool_events')).rows).toHaveLength(2)
      await expect(db.query(`update public.ai_tutor_runs set tool_count = 8`)).rejects.toThrow('permission denied')
      await db.exec(`set request.jwt.claim.sub = '${other}';`)
      expect((await db.query('select * from public.ai_tutor_runs')).rows).toHaveLength(0)
    } finally { await db.exec('reset role') }
  })
})
