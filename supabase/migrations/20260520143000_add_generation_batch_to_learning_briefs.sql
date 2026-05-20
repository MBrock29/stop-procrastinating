alter table public.learning_briefs
  add column if not exists generation_batch_id uuid;

create unique index if not exists learning_briefs_user_generation_batch_unique_idx
  on public.learning_briefs (user_id, generation_batch_id)
  where generation_batch_id is not null;
