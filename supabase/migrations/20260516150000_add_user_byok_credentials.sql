create table if not exists public.user_byok_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'openrouter')),
  encrypted_api_key text not null,
  key_last_four text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_byok_credentials enable row level security;

create policy "byok credentials are viewable by owner"
  on public.user_byok_credentials
  for select
  using (auth.uid() = user_id);

create policy "byok credentials are insertable by owner"
  on public.user_byok_credentials
  for insert
  with check (auth.uid() = user_id);

create policy "byok credentials are updatable by owner"
  on public.user_byok_credentials
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "byok credentials are deletable by owner"
  on public.user_byok_credentials
  for delete
  using (auth.uid() = user_id);
