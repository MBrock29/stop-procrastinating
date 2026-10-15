import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const owner = '00000000-0000-0000-0000-000000000101'
const other = '00000000-0000-0000-0000-000000000102'

async function migration(name: string) {
  const sql = await readFile(
    new URL(`../../supabase/migrations/${name}.sql`, import.meta.url),
    'utf8',
  )
  await db.exec(sql.replace('create extension if not exists "pgcrypto";', ''))
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');`)
  for (const name of [
    '20260501110000_create_blocked_domains',
    '20260501120000_create_learning_cards',
    '20260501130000_create_interrupt_sessions_and_reviews',
    '20261015230000_product_experience',
    '20261015231000_consumer_session_sources',
    '20261016090000_default_always_on_protection',
  ]) {
    if (name === '20261016090000_default_always_on_protection') {
      await db.query(
        `insert into public.blocked_domains(user_id, domain, schedule_days, schedule_start, schedule_end)
        values($1, 'custom-hours.example', '{2,4}', '13:00', '19:00')`,
        [other],
      )
    }
    await migration(name)
  }
}, 30_000)

afterAll(async () => {
  await db.close()
})

describe('product experience migration', () => {
  it('preserves existing custom schedules when changing the default', async () => {
    const { rows } =
      await db.query(`select schedule_days, schedule_all_day, schedule_start::text, schedule_end::text
      from public.blocked_domains where domain = 'custom-hours.example'`)
    expect(rows[0]).toMatchObject({
      schedule_days: [2, 4],
      schedule_all_day: false,
      schedule_start: '13:00:00',
      schedule_end: '19:00:00',
    })
  })
  it('adds bounded schedules, intervention modes and interruption outcomes', async () => {
    await db.query(
      `insert into public.blocked_domains(user_id, domain) values($1, 'reddit.com')`,
      [owner],
    )
    const { rows } = await db.query<{
      schedule_days: number[]
      schedule_start: string
      schedule_all_day: boolean
      intervention_mode: string
    }>(
      `select schedule_days, schedule_start::text, schedule_all_day, intervention_mode
      from public.blocked_domains where user_id = $1`,
      [owner],
    )
    expect(rows[0]).toMatchObject({
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      schedule_all_day: true,
      schedule_start: '09:00:00',
      intervention_mode: 'quick',
    })
    await expect(
      db.query(
        `update public.blocked_domains set schedule_days = '{8}'
      where user_id = $1`,
        [owner],
      ),
    ).rejects.toThrow()

    await db.query(
      `insert into public.interrupt_sessions(user_id, blocked_domain,
      outcome, intervention_mode) values($1, 'reddit.com', 'bypassed', 'intentional')`,
      [owner],
    )
    const interrupt = await db.query<{
      outcome: string
      intervention_mode: string
    }>(
      `select outcome, intervention_mode from public.interrupt_sessions where user_id = $1`,
      [owner],
    )
    expect(interrupt.rows[0]).toEqual({
      outcome: 'bypassed',
      intervention_mode: 'intentional',
    })
  })

  it('keeps profiles and instrumentation isolated to their owner', async () => {
    try {
      await db.exec(
        `set role authenticated; set request.jwt.claim.sub = '${owner}';`,
      )
      await db.query(
        `insert into public.user_product_profiles(user_id, learning_category,
        learning_goal) values($1, 'Programming', 'Learn TypeScript')`,
        [owner],
      )
      await db.query(
        `insert into public.product_events(user_id, event_type, properties)
        values($1, 'onboarding_completed', '{"template":"react"}')`,
        [owner],
      )
      expect(
        (await db.query('select * from public.user_product_profiles')).rows,
      ).toHaveLength(1)
      expect(
        (await db.query('select * from public.product_events')).rows,
      ).toHaveLength(1)

      await db.exec(`set request.jwt.claim.sub = '${other}';`)
      expect(
        (await db.query('select * from public.user_product_profiles')).rows,
      ).toHaveLength(0)
      expect(
        (await db.query('select * from public.product_events')).rows,
      ).toHaveLength(0)
      await expect(
        db.query(
          `insert into public.product_events(user_id, event_type)
        values($1, 'upgrade_clicked')`,
          [owner],
        ),
      ).rejects.toThrow()
    } finally {
      await db.exec('reset role')
    }
  })

  it('rejects unbounded or unknown analytics payloads', async () => {
    await expect(
      db.query(
        `insert into public.product_events(user_id, event_type)
      values($1, 'arbitrary_event')`,
        [owner],
      ),
    ).rejects.toThrow()
    await expect(
      db.query(
        `insert into public.product_events(user_id, event_type, properties)
      values($1, 'source_created', jsonb_build_object('text', repeat('x', 5000)))`,
        [owner],
      ),
    ).rejects.toThrow()
  })

  it('distinguishes practice from extension sessions without inventing legacy attribution', async () => {
    await db.query(
      `insert into public.interrupt_sessions(user_id, blocked_domain, source)
      values($1, 'practice', 'practice'), ($1, 'youtube.com', 'extension')`,
      [owner],
    )
    const { rows } = await db.query<{ source: string }>(
      `select source from public.interrupt_sessions`,
    )
    expect(rows.map((row) => row.source)).toEqual(
      expect.arrayContaining(['unknown', 'practice', 'extension']),
    )
    await expect(
      db.query(
        `insert into public.interrupt_sessions(user_id, blocked_domain, source)
      values($1, 'example.com', 'made-up')`,
        [owner],
      ),
    ).rejects.toThrow()
  })
})
