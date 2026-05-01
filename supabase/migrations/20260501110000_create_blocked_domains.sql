create extension if not exists "pgcrypto";

create table if not exists public.blocked_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists blocked_domains_user_domain_idx
  on public.blocked_domains (user_id, domain);

alter table public.blocked_domains enable row level security;

create policy "blocked domains are viewable by owner"
  on public.blocked_domains
  for select
  using (auth.uid() = user_id);

create policy "blocked domains are insertable by owner"
  on public.blocked_domains
  for insert
  with check (auth.uid() = user_id);

create policy "blocked domains are updatable by owner"
  on public.blocked_domains
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "blocked domains are deletable by owner"
  on public.blocked_domains
  for delete
  using (auth.uid() = user_id);
