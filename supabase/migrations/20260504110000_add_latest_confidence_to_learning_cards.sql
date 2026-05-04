alter table public.learning_cards
  add column if not exists latest_confidence text
    check (latest_confidence in ('know', 'semi', 'not_confident'));
