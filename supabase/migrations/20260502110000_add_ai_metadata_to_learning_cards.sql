alter table public.learning_cards
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai')),
  add column if not exists generation_topic text,
  add column if not exists is_user_edited boolean not null default false;
