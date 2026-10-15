-- Extend the existing event stream; legacy events retain null timing/version fields.
alter table public.ai_generation_events
  add column request_id uuid,
  add column prompt_version text,
  add column latency_ms integer check (latency_ms >= 0);
create index ai_generation_events_request_idx on public.ai_generation_events(request_id);

create table public.topic_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (length(trim(topic)) > 0),
  know_count integer not null default 0 check (know_count >= 0),
  semi_count integer not null default 0 check (semi_count >= 0),
  not_confident_count integer not null default 0 check (not_confident_count >= 0),
  attempts integer generated always as (know_count + semi_count + not_confident_count) stored,
  mastery_score numeric(5,2) generated always as (
    case when know_count + semi_count + not_confident_count = 0 then 0
    else round(100.0 * (know_count + semi_count * 0.5) /
      (know_count + semi_count + not_confident_count), 2) end
  ) stored,
  last_reviewed_at timestamptz,
  next_recommended_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, topic)
);
alter table public.topic_mastery enable row level security;
create policy "Owners read topic mastery" on public.topic_mastery for select
  to authenticated using (auth.uid() = user_id);
-- Only the review trigger writes mastery. Clients cannot fabricate these aggregates.
revoke all on public.topic_mastery from anon, authenticated;
grant select on public.topic_mastery to authenticated;

create function public.record_topic_mastery() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  review_topic text;
  state public.topic_mastery;
begin
  select lower(trim(c.generation_topic)) into review_topic
  from public.learning_cards c
  where c.id = new.card_id and c.user_id = new.user_id;
  if not found then raise exception 'Review card must belong to the learner'; end if;
  if not exists (select 1 from public.interrupt_sessions s
    where s.id = new.interrupt_session_id and s.user_id = new.user_id) then
    raise exception 'Review session must belong to the learner';
  end if;
  if review_topic is null or review_topic = '' then return new; end if;
  insert into public.topic_mastery(user_id, topic, know_count, semi_count, not_confident_count, last_reviewed_at)
  values(new.user_id, review_topic, (new.confidence = 'know')::integer,
    (new.confidence = 'semi')::integer, (new.confidence = 'not_confident')::integer, new.reviewed_at)
  on conflict(user_id, topic) do update set
    know_count = topic_mastery.know_count + excluded.know_count,
    semi_count = topic_mastery.semi_count + excluded.semi_count,
    not_confident_count = topic_mastery.not_confident_count + excluded.not_confident_count,
    last_reviewed_at = greatest(topic_mastery.last_reviewed_at, excluded.last_reviewed_at), updated_at = now()
  returning * into state;
  update public.topic_mastery set next_recommended_review_at = state.last_reviewed_at +
    case when state.mastery_score >= 80 then interval '7 days'
      when state.mastery_score >= 50 then interval '3 days' else interval '1 day' end
  where user_id = new.user_id and topic = review_topic;
  return new;
end;
$$;
revoke all on function public.record_topic_mastery() from public;
create trigger card_review_topic_mastery after insert on public.card_reviews
for each row execute function public.record_topic_mastery();

-- Backfill only recorded, owner-consistent reviews; do not invent historical attempts.
insert into public.topic_mastery(user_id, topic, know_count, semi_count, not_confident_count, last_reviewed_at)
select r.user_id, lower(trim(c.generation_topic)),
  count(*) filter(where r.confidence = 'know'), count(*) filter(where r.confidence = 'semi'),
  count(*) filter(where r.confidence = 'not_confident'), max(r.reviewed_at)
from public.card_reviews r
join public.learning_cards c on c.id = r.card_id and c.user_id = r.user_id
join public.interrupt_sessions s on s.id = r.interrupt_session_id and s.user_id = r.user_id
where nullif(trim(c.generation_topic), '') is not null
group by r.user_id, lower(trim(c.generation_topic));
update public.topic_mastery set next_recommended_review_at = last_reviewed_at +
  case when mastery_score >= 80 then interval '7 days'
    when mastery_score >= 50 then interval '3 days' else interval '1 day' end;

-- Eval history is published by trusted automation; owners can inspect their runs.
create table public.ai_eval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suite_name text not null,
  mode text not null check (mode in ('offline-evaluator', 'live-model')),
  prompt_version text,
  model text,
  provider text,
  report jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_eval_runs enable row level security;
create policy "Owners read eval history" on public.ai_eval_runs for select
  to authenticated using (auth.uid() = user_id);
revoke all on public.ai_eval_runs from anon, authenticated;
grant select on public.ai_eval_runs to authenticated;
