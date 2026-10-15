import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite-pgvector'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite({ extensions: { vector } })
const owner = '00000000-0000-0000-0000-000000000021'
const other = '00000000-0000-0000-0000-000000000022'
const source = '00000000-0000-0000-0000-000000000023'
const chunk = '00000000-0000-0000-0000-000000000024'

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
  for (const name of ['20260501120000_create_learning_cards', '20260502110000_add_ai_metadata_to_learning_cards']) await migration(name)
  await migration('20261015220000_grounded_learning_sources')
  await db.query(`insert into public.learning_sources(id,user_id,title,source_type,content_hash,status,chunk_count,embedding_model)
    values($1,$2,'Owner source','text',$3,'ready',1,'text-embedding-3-small')`, [source, owner, 'a'.repeat(64)])
  await db.query(`insert into public.learning_source_chunks(id,source_id,user_id,chunk_index,content,token_estimate,embedding)
    values($1,$2,$3,0,'Caching avoids repeated work.',5,array_fill(0.0::real,array[1536])::vector)`, [chunk, source, owner])
}, 30_000)
afterAll(async () => { await db.close() })

describe('grounded source migration', () => {
  it('scopes vector retrieval to auth.uid and source ownership', async () => {
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`)
      expect((await db.query(`select * from public.match_learning_source_chunks(
        array_fill(0.0::real,array[1536])::vector, 8, $1)`, [source])).rows).toHaveLength(1)
      await db.exec(`set request.jwt.claim.sub = '${other}';`)
      expect((await db.query(`select * from public.match_learning_source_chunks(
        array_fill(0.0::real,array[1536])::vector, 8, $1)`, [source])).rows).toHaveLength(0)
    } finally { await db.exec('reset role') }
  })
  it('allows owner reads/deletes but denies browser source and event fabrication', async () => {
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`)
      expect((await db.query('select * from public.learning_sources')).rows).toHaveLength(1)
      await expect(db.query(`insert into public.grounded_generation_events(request_id,user_id,topic,model,embedding_model,prompt_version,latency_ms,status)
        values($1,$2,'forged','model','embed','prompt',1,'success')`, [crypto.randomUUID(), owner])).rejects.toThrow('permission denied')
      await expect(db.query(`insert into public.learning_source_chunks(source_id,user_id,chunk_index,content,token_estimate,embedding)
        values($1,$2,1,'forged',1,array_fill(0.0::real,array[1536])::vector)`, [source, owner])).rejects.toThrow('permission denied')
    } finally { await db.exec('reset role') }
  })
  it('atomically persists cited cards and generation telemetry', async () => {
    const requestId = crypto.randomUUID()
    await db.query(`select public.persist_grounded_generation($1::jsonb,$2::jsonb)`, [
      JSON.stringify({ request_id: requestId, user_id: owner, source_id: source, topic: 'Caching', model: 'gpt-5-mini',
        embedding_model: 'text-embedding-3-small', prompt_version: 'grounded-cards-v1',
        retrieved_chunk_ids: [chunk], retrieved_similarities: [0.8], grounding_pass_rate: 100,
        latency_ms: 100, input_tokens: 10, output_tokens: 20, estimated_cost_usd: null }),
      JSON.stringify([{ question: 'Why cache?', answer: 'To avoid repeated work.', citation_chunk_ids: [chunk],
        citation_excerpts: ['Caching avoids repeated work.'], grounding_score: 100 }]),
    ])
    const cards = await db.query<{ citation_chunk_ids: string[]; grounding_score: string }>('select citation_chunk_ids,grounding_score from public.learning_cards')
    expect(cards.rows[0].citation_chunk_ids).toEqual([chunk])
    expect(cards.rows[0].grounding_score).toBe('100.00')
    expect((await db.query('select * from public.grounded_generation_events where request_id = $1', [requestId])).rows).toHaveLength(1)
  })
  it('rejects cross-owner persistence before writing cards', async () => {
    const before = (await db.query('select * from public.learning_cards')).rows.length
    await expect(db.query(`select public.persist_grounded_generation($1::jsonb,$2::jsonb)`, [
      JSON.stringify({ source_id: source, user_id: other }), JSON.stringify([{ question: 'x' }])
    ])).rejects.toThrow('Source ownership validation failed')
    expect((await db.query('select * from public.learning_cards')).rows).toHaveLength(before)
  })
})
