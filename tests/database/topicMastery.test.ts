import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const owner = '00000000-0000-0000-0000-000000000001'
const other = '00000000-0000-0000-0000-000000000002'
const card = '00000000-0000-0000-0000-000000000003'
const session = '00000000-0000-0000-0000-000000000004'
const otherSession = '00000000-0000-0000-0000-000000000005'

async function migration(name: string) {
  await db.exec(await readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'))
}

beforeAll(async () => {
  // Minimal Supabase auth contract. These are Postgres tests, not hosted Supabase tests.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');`)
  for (const name of [
    '20260501120000_create_learning_cards',
    '20260501130000_create_interrupt_sessions_and_reviews',
    '20260502110000_add_ai_metadata_to_learning_cards',
    '20260516100000_add_ai_access_controls',
  ]) await migration(name)
  await db.query(`insert into public.learning_cards(id,user_id,question,answer,generation_topic)
    values($1,$2,'When should effects clean up?','Before replacement or unmount.',' React ')`, [card, owner])
  await db.query(`insert into public.interrupt_sessions(id,user_id,blocked_domain) values($1,$2,'example.com'),($3,$4,'example.com')`,
    [session, owner, otherSession, other])
  await db.query(`insert into public.card_reviews(card_id,user_id,interrupt_session_id,confidence,reviewed_at)
    values($1,$2,$3,'know','2026-10-10T00:00:00Z')`, [card, owner, session])
  await migration('20261015210000_ai_observability_and_mastery')
}, 30_000)

afterAll(async () => { await db.close() })

describe('review-derived mastery migration', () => {
  it('backfills actual reviews with normalized topics and an explainable score', async () => {
    const { rows } = await db.query<{ topic: string; attempts: number; mastery_score: string }>('select * from public.topic_mastery')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ topic: 'react', attempts: 1, mastery_score: '100.00' })
  })
  it('atomically updates confidence and does not move the latest review backwards', async () => {
    await db.query(`insert into public.card_reviews(card_id,user_id,interrupt_session_id,confidence,reviewed_at)
      values($1,$2,$3,'not_confident','2026-10-09T00:00:00Z')`, [card, owner, session])
    const { rows } = await db.query<{ attempts: number; mastery_score: string; next_recommended_review_at: Date }>('select * from public.topic_mastery')
    expect(rows[0].attempts).toBe(2)
    expect(rows[0].mastery_score).toBe('50.00')
    expect(rows[0].next_recommended_review_at.toISOString()).toBe('2026-10-13T00:00:00.000Z')
  })
  it('rejects cross-owner cards and interrupt sessions', async () => {
    await expect(db.query(`insert into public.card_reviews(card_id,user_id,interrupt_session_id,confidence)
      values($1,$2,$3,'know')`, [card, other, otherSession])).rejects.toThrow('Review card must belong')
    await expect(db.query(`insert into public.card_reviews(card_id,user_id,interrupt_session_id,confidence)
      values($1,$2,$3,'know')`, [card, owner, otherSession])).rejects.toThrow('Review session must belong')
  })
  it('allows owner reads, hides other owners, and forbids client writes', async () => {
    try {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`)
      expect((await db.query('select * from public.topic_mastery')).rows).toHaveLength(1)
      await expect(db.query(`update public.topic_mastery set know_count = 900`)).rejects.toThrow('permission denied')
      await db.exec(`set request.jwt.claim.sub = '${other}';`)
      expect((await db.query('select * from public.topic_mastery')).rows).toHaveLength(0)
      await expect(db.query(`insert into public.ai_eval_runs(user_id,suite_name,mode,report)
        values($1,'forged','live-model','{}')`, [other])).rejects.toThrow('permission denied')
    } finally { await db.exec('reset role') }
  })
})
