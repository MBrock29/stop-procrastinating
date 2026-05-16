alter table public.learning_cards
  add column if not exists generation_batch_id uuid;

create index if not exists learning_cards_user_generation_batch_idx
  on public.learning_cards (user_id, generation_batch_id);
