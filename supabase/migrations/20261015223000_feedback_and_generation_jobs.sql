-- Human feedback and a service-owned, fenced generation queue.

alter table public.learning_cards
  add constraint learning_cards_id_user_unique unique (id, user_id);

create table public.ai_card_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null,
  source_id uuid,
  feedback_type text not null check (feedback_type in (
    'useful', 'incorrect', 'too_easy', 'too_hard', 'weak_citation'
  )),
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id),
  foreign key (card_id, user_id)
    references public.learning_cards(id, user_id) on delete cascade,
  foreign key (source_id, user_id)
    references public.learning_sources(id, user_id) on delete cascade
);
create index ai_card_feedback_user_created_idx
  on public.ai_card_feedback(user_id, created_at desc);
alter table public.ai_card_feedback enable row level security;
create policy "Owners read AI card feedback" on public.ai_card_feedback for select
  to authenticated using (auth.uid() = user_id);
create policy "Owners insert AI card feedback" on public.ai_card_feedback for insert
  to authenticated with check (auth.uid() = user_id);
create policy "Owners update AI card feedback" on public.ai_card_feedback for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners delete AI card feedback" on public.ai_card_feedback for delete
  to authenticated using (auth.uid() = user_id);
revoke all on public.ai_card_feedback from anon, authenticated;
grant select, insert, update, delete on public.ai_card_feedback to authenticated;

create table public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  job_type text not null check (job_type in ('cards', 'grounded_cards', 'brief')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 100000
    and not (payload ?| array['access_token', 'userAccessToken', 'authorization', 'jwt', 'apiKey'])
  ),
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'succeeded', 'failed', 'dead_letter')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 4 check (max_attempts between 1 and 8),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  lock_token uuid,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, idempotency_key),
  check (
    (status = 'processing' and locked_at is not null and locked_by is not null and lock_token is not null)
    or (status <> 'processing' and locked_at is null and locked_by is null and lock_token is null)
  )
);
create index ai_generation_jobs_claim_idx
  on public.ai_generation_jobs(next_attempt_at, created_at)
  where status in ('queued', 'failed');
create index ai_generation_jobs_user_created_idx
  on public.ai_generation_jobs(user_id, created_at desc);
alter table public.ai_generation_jobs enable row level security;
create policy "Owners read generation jobs" on public.ai_generation_jobs for select
  to authenticated using (auth.uid() = user_id);
revoke all on public.ai_generation_jobs from anon, authenticated;
grant select on public.ai_generation_jobs to authenticated;

create function public.claim_next_ai_generation_job(p_worker_id text)
returns public.ai_generation_jobs
language plpgsql security definer set search_path = '' as $$
declare v_job public.ai_generation_jobs;
begin
  if length(trim(coalesce(p_worker_id, ''))) not between 3 and 200 then
    raise exception 'Invalid worker identifier';
  end if;
  select * into v_job from public.ai_generation_jobs
  where status in ('queued', 'failed') and next_attempt_at <= now()
  order by next_attempt_at, created_at
  for update skip locked limit 1;
  if v_job.id is null then return null; end if;
  update public.ai_generation_jobs set status = 'processing', attempt_count = attempt_count + 1,
    locked_at = now(), locked_by = p_worker_id, lock_token = gen_random_uuid(),
    updated_at = now(), error_message = null
  where id = v_job.id returning * into v_job;
  return v_job;
end;
$$;

create function public.complete_ai_generation_job(
  p_job_id uuid, p_worker_id text, p_lock_token uuid, p_result jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_updated integer;
begin
  update public.ai_generation_jobs set status = 'succeeded', result = p_result,
    error_message = null, completed_at = now(), locked_at = null, locked_by = null,
    lock_token = null, updated_at = now()
  where id = p_job_id and status = 'processing' and locked_by = p_worker_id
    and lock_token = p_lock_token;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.fail_ai_generation_job(
  p_job_id uuid, p_worker_id text, p_lock_token uuid, p_error_message text
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_job public.ai_generation_jobs; v_status text;
begin
  select * into v_job from public.ai_generation_jobs where id = p_job_id
    and status = 'processing' and locked_by = p_worker_id and lock_token = p_lock_token
    for update;
  if v_job.id is null then return 'lock_lost'; end if;
  v_status := case when v_job.attempt_count >= v_job.max_attempts then 'dead_letter' else 'failed' end;
  update public.ai_generation_jobs set status = v_status,
    next_attempt_at = case when v_status = 'failed' then
      now() + make_interval(secs => least(300, (10 * power(2, greatest(0, attempt_count - 1)))::integer))
      else next_attempt_at end,
    error_message = left(coalesce(p_error_message, 'Generation failed.'), 2000),
    completed_at = case when v_status = 'dead_letter' then now() else null end,
    locked_at = null, locked_by = null, lock_token = null, updated_at = now()
  where id = p_job_id;
  return v_status;
end;
$$;

create function public.recover_stale_ai_generation_jobs(
  p_stale_after interval default interval '10 minutes'
) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_stale_after < interval '1 minute' then raise exception 'Stale threshold is too short'; end if;
  update public.ai_generation_jobs set
    status = case when attempt_count >= max_attempts then 'dead_letter' else 'failed' end,
    next_attempt_at = now(),
    error_message = 'Recovered an expired worker lock.',
    completed_at = case when attempt_count >= max_attempts then now() else null end,
    locked_at = null, locked_by = null, lock_token = null, updated_at = now()
  where status = 'processing' and locked_at < now() - p_stale_after;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.claim_next_ai_generation_job(text) from public, anon, authenticated;
revoke all on function public.complete_ai_generation_job(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_ai_generation_job(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.recover_stale_ai_generation_jobs(interval) from public, anon, authenticated;
grant execute on function public.claim_next_ai_generation_job(text) to service_role;
grant execute on function public.complete_ai_generation_job(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.fail_ai_generation_job(uuid, text, uuid, text) to service_role;
grant execute on function public.recover_stale_ai_generation_jobs(interval) to service_role;

-- The browser retrieval function intentionally uses auth.uid(). Workers use this
-- service-only variant after the shared handler validates the source owner.
create function public.match_learning_source_chunks_for_service(
  p_user_id uuid, p_query_embedding vector(1536), p_match_count integer default 8,
  p_source_id uuid default null
) returns table(id uuid, source_id uuid, chunk_index integer, content text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.source_id, c.chunk_index, c.content,
    1 - (c.embedding operator(public.<=>) p_query_embedding) as similarity
  from public.learning_source_chunks c
  where c.user_id = p_user_id and (p_source_id is null or c.source_id = p_source_id)
  order by c.embedding operator(public.<=>) p_query_embedding
  limit greatest(1, least(p_match_count, 20));
$$;
revoke all on function public.match_learning_source_chunks_for_service(uuid, vector, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.match_learning_source_chunks_for_service(uuid, vector, integer, uuid)
  to service_role;

-- Return saved card IDs so the UI can attach feedback to the actual cards. A
-- generation batch makes worker retries observable and idempotent.
drop function public.persist_grounded_generation(jsonb, jsonb);
create function public.persist_grounded_generation(p_event jsonb, p_cards jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare card jsonb; v_ids jsonb := '[]'::jsonb; v_card_id uuid; v_batch_id uuid;
begin
  if not exists (select 1 from public.learning_sources s where
    s.id = (p_event->>'source_id')::uuid and s.user_id = (p_event->>'user_id')::uuid and s.status = 'ready') then
    raise exception 'Source ownership validation failed';
  end if;
  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) < 1 then
    raise exception 'Grounded cards are required';
  end if;
  v_batch_id := nullif(p_event->>'generation_batch_id', '')::uuid;
  if v_batch_id is not null and exists (select 1 from public.learning_cards where
    user_id = (p_event->>'user_id')::uuid and generation_batch_id = v_batch_id) then
    select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb) into v_ids
      from public.learning_cards where user_id = (p_event->>'user_id')::uuid
      and generation_batch_id = v_batch_id;
    return v_ids;
  end if;
  for card in select value from jsonb_array_elements(p_cards) loop
    v_card_id := coalesce(nullif(card->>'id', '')::uuid, gen_random_uuid());
    insert into public.learning_cards(id,user_id,question,answer,source,generation_topic,
      generation_batch_id,is_user_edited,grounded_source_id,citation_chunk_ids,citation_excerpts,grounding_score)
    values(v_card_id,(p_event->>'user_id')::uuid,card->>'question',card->>'answer','ai',
      p_event->>'topic',v_batch_id,false,(p_event->>'source_id')::uuid,
      array(select value::uuid from jsonb_array_elements_text(card->'citation_chunk_ids')),
      array(select value from jsonb_array_elements_text(card->'citation_excerpts')),
      (card->>'grounding_score')::numeric);
    v_ids := v_ids || to_jsonb(v_card_id);
  end loop;
  insert into public.grounded_generation_events(request_id,user_id,source_id,topic,model,
    embedding_model,prompt_version,retrieved_chunk_ids,retrieved_similarities,card_count,
    grounding_pass_rate,latency_ms,input_tokens,output_tokens,estimated_cost_usd,status)
  values((p_event->>'request_id')::uuid,(p_event->>'user_id')::uuid,(p_event->>'source_id')::uuid,
    p_event->>'topic',p_event->>'model',p_event->>'embedding_model',p_event->>'prompt_version',
    array(select value::uuid from jsonb_array_elements_text(p_event->'retrieved_chunk_ids')),
    array(select value::double precision from jsonb_array_elements_text(p_event->'retrieved_similarities')),
    jsonb_array_length(p_cards),(p_event->>'grounding_pass_rate')::numeric,
    (p_event->>'latency_ms')::integer,(p_event->>'input_tokens')::integer,
    (p_event->>'output_tokens')::integer,(p_event->>'estimated_cost_usd')::numeric,'success');
  return v_ids;
end;
$$;
revoke all on function public.persist_grounded_generation(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_grounded_generation(jsonb, jsonb) to service_role;
