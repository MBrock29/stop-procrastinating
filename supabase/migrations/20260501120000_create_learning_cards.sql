create table if not exists public.learning_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  is_archived boolean not null default false,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  know_count integer not null default 0,
  semi_count integer not null default 0,
  not_confident_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_cards_user_next_review_idx
  on public.learning_cards (user_id, next_review_at);

alter table public.learning_cards enable row level security;

create policy "learning cards are viewable by owner"
  on public.learning_cards
  for select
  using (auth.uid() = user_id);

create policy "learning cards are insertable by owner"
  on public.learning_cards
  for insert
  with check (auth.uid() = user_id);

create policy "learning cards are updatable by owner"
  on public.learning_cards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "learning cards are deletable by owner"
  on public.learning_cards
  for delete
  using (auth.uid() = user_id);
