-- Consumer onboarding, outcome instrumentation and real-life blocking controls.

create table public.user_product_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learning_category text,
  learning_goal text check (learning_goal is null or length(learning_goal) <= 500),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_product_profiles enable row level security;
create policy "Owners manage product profile" on public.user_product_profiles for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.user_product_profiles to authenticated;

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'onboarding_started', 'onboarding_completed', 'extension_install_clicked',
    'test_interruption_started', 'interruption_started', 'interruption_completed',
    'interruption_bypassed', 'source_created', 'upgrade_clicked',
    'site_rule_paused', 'site_rule_resumed'
  )),
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object' and octet_length(properties::text) <= 4000
  ),
  occurred_at timestamptz not null default now()
);
create index product_events_user_occurred_idx on public.product_events(user_id, occurred_at desc);
alter table public.product_events enable row level security;
create policy "Owners read product events" on public.product_events for select
  to authenticated using (auth.uid() = user_id);
create policy "Owners insert product events" on public.product_events for insert
  to authenticated with check (auth.uid() = user_id);
grant select, insert on public.product_events to authenticated;

alter table public.interrupt_sessions
  add column outcome text not null default 'started'
    check (outcome in ('started', 'completed', 'bypassed')),
  add column intervention_mode text not null default 'quick'
    check (intervention_mode in ('quick', 'focus', 'intentional', 'soft', 'hard', 'smart'));

alter table public.blocked_domains
  add column schedule_days integer[] not null default '{1,2,3,4,5}',
  add column schedule_start time not null default '09:00',
  add column schedule_end time not null default '17:00',
  add column intervention_mode text not null default 'quick'
    check (intervention_mode in ('quick', 'focus', 'intentional', 'soft', 'hard', 'smart')),
  add column paused_until timestamptz,
  add constraint blocked_domains_schedule_days_check check (
    cardinality(schedule_days) between 1 and 7 and schedule_days <@ array[0,1,2,3,4,5,6]
  ),
  add constraint blocked_domains_schedule_window_check check (schedule_start <> schedule_end);
