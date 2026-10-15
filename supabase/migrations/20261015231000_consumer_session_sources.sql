-- Keep deliberate practice/test sessions out of distraction-conversion metrics.
alter table public.interrupt_sessions
  add column source text not null default 'unknown'
  check (source in ('extension', 'practice', 'onboarding', 'unknown'));

-- Older completed sessions predate explicit outcome writes. Preserve their history,
-- but do not guess whether they came from a real distraction or a manual session.
update public.interrupt_sessions set outcome = 'completed'
where completed_at is not null and outcome = 'started';
