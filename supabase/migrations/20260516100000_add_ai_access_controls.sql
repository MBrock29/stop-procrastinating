create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'byok')),
  byok_provider text not null default 'openrouter' check (byok_provider in ('openai', 'openrouter')),
  preferred_model text not null default 'gpt-4o-mini' check (preferred_model in ('gpt-4o-mini', 'gpt-5.4-mini')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  plan_tier text not null check (plan_tier in ('free', 'pro', 'byok')),
  provider text not null check (provider in ('openai', 'openrouter')),
  model text not null,
  card_count integer not null check (card_count > 0),
  status text not null check (status in ('success', 'limit_exceeded', 'rate_limited', 'blocked', 'failed')),
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  used_byok boolean not null default false,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_generation_events_user_created_idx
  on public.ai_generation_events (user_id, created_at desc);

create index if not exists ai_generation_events_user_month_idx
  on public.ai_generation_events (user_id, status, created_at desc);

alter table public.user_ai_settings enable row level security;
alter table public.ai_generation_events enable row level security;

create policy "ai settings are viewable by owner"
  on public.user_ai_settings
  for select
  using (auth.uid() = user_id);

create policy "ai settings are insertable by owner"
  on public.user_ai_settings
  for insert
  with check (auth.uid() = user_id);

create policy "ai settings are updatable by owner"
  on public.user_ai_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ai generation events are viewable by owner"
  on public.ai_generation_events
  for select
  using (auth.uid() = user_id);

create policy "ai generation events are insertable by owner"
  on public.ai_generation_events
  for insert
  with check (auth.uid() = user_id);
