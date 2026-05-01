create table if not exists public.interrupt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  blocked_domain text not null,
  triggered_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists interrupt_sessions_user_triggered_idx
  on public.interrupt_sessions (user_id, triggered_at desc);

alter table public.interrupt_sessions enable row level security;

create policy "interrupt sessions are viewable by owner"
  on public.interrupt_sessions
  for select
  using (auth.uid() = user_id);

create policy "interrupt sessions are insertable by owner"
  on public.interrupt_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "interrupt sessions are updatable by owner"
  on public.interrupt_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.card_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.learning_cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  interrupt_session_id uuid not null references public.interrupt_sessions (id) on delete cascade,
  confidence text not null check (confidence in ('know', 'semi', 'not_confident')),
  reviewed_at timestamptz not null default timezone('utc', now())
);

create index if not exists card_reviews_user_reviewed_idx
  on public.card_reviews (user_id, reviewed_at desc);

alter table public.card_reviews enable row level security;

create policy "card reviews are viewable by owner"
  on public.card_reviews
  for select
  using (auth.uid() = user_id);

create policy "card reviews are insertable by owner"
  on public.card_reviews
  for insert
  with check (auth.uid() = user_id);
