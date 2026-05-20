create table if not exists public.learning_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  title text not null,
  content text not null,
  kind text not null check (kind in ('summary', 'briefing')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_briefs_user_created_idx
  on public.learning_briefs (user_id, created_at desc);

alter table public.learning_briefs enable row level security;

create policy "learning briefs are viewable by owner"
  on public.learning_briefs
  for select
  using (auth.uid() = user_id);

create policy "learning briefs are insertable by owner"
  on public.learning_briefs
  for insert
  with check (auth.uid() = user_id);

create policy "learning briefs are deletable by owner"
  on public.learning_briefs
  for delete
  using (auth.uid() = user_id);

alter table public.user_ai_settings
  add column if not exists premium_interrupt_mode text not null default 'cards';

update public.user_ai_settings
set premium_interrupt_mode = 'cards'
where premium_interrupt_mode is null;

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_premium_interrupt_mode_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_premium_interrupt_mode_check
    check (premium_interrupt_mode in ('cards', 'summary'));
