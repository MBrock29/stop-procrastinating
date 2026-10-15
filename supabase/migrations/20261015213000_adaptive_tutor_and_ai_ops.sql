create table public.ai_tutor_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  model text not null,
  prompt_version text not null,
  status text not null check (status in ('success', 'failed')),
  recommendation jsonb,
  tool_count integer not null default 0 check (tool_count between 0 and 8),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd >= 0),
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (
    (status = 'success' and recommendation is not null and failure_reason is null) or
    (status = 'failed' and recommendation is null and failure_reason is not null)
  )
);

create table public.ai_tutor_tool_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence integer not null check (sequence between 1 and 8),
  tool_name text not null check (tool_name in (
    'get_topic_mastery', 'get_due_cards', 'get_recent_weaknesses',
    'get_recent_learning_briefs'
  )),
  arguments jsonb not null,
  result_summary jsonb,
  status text not null check (status in ('success', 'failed')),
  latency_ms integer not null check (latency_ms >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  unique (run_id, sequence),
  foreign key (run_id, user_id) references public.ai_tutor_runs(id, user_id) on delete cascade,
  check (
    (status = 'success' and result_summary is not null and error_message is null) or
    (status = 'failed' and error_message is not null)
  )
);

create index ai_tutor_runs_user_created_idx
  on public.ai_tutor_runs(user_id, created_at desc);
create index ai_tutor_tool_events_user_created_idx
  on public.ai_tutor_tool_events(user_id, created_at desc);

alter table public.ai_tutor_runs enable row level security;
alter table public.ai_tutor_tool_events enable row level security;

create policy "Owners read tutor runs" on public.ai_tutor_runs for select
  to authenticated using (auth.uid() = user_id);
create policy "Owners read tutor tool events" on public.ai_tutor_tool_events for select
  to authenticated using (auth.uid() = user_id);

-- Edge Functions write through the service role. Browser clients cannot forge traces.
revoke all on public.ai_tutor_runs from anon, authenticated;
revoke all on public.ai_tutor_tool_events from anon, authenticated;
grant select on public.ai_tutor_runs to authenticated;
grant select on public.ai_tutor_tool_events to authenticated;

create function public.record_ai_tutor_run(p_run jsonb, p_trace jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  trace_item jsonb;
begin
  if jsonb_typeof(p_trace) <> 'array' or jsonb_array_length(p_trace) > 8 then
    raise exception 'Invalid tutor trace';
  end if;

  insert into public.ai_tutor_runs (
    id, user_id, request_id, model, prompt_version, status, recommendation,
    tool_count, latency_ms, input_tokens, output_tokens, estimated_cost_usd,
    failure_reason
  ) values (
    (p_run->>'id')::uuid, (p_run->>'user_id')::uuid,
    (p_run->>'request_id')::uuid, p_run->>'model', p_run->>'prompt_version',
    p_run->>'status', nullif(p_run->'recommendation', 'null'::jsonb),
    (p_run->>'tool_count')::integer, (p_run->>'latency_ms')::integer,
    (p_run->>'input_tokens')::integer, (p_run->>'output_tokens')::integer,
    (p_run->>'estimated_cost_usd')::numeric, p_run->>'failure_reason'
  );

  for trace_item in select value from jsonb_array_elements(p_trace)
  loop
    insert into public.ai_tutor_tool_events (
      run_id, user_id, sequence, tool_name, arguments, result_summary,
      status, latency_ms, error_message
    ) values (
      (p_run->>'id')::uuid, (p_run->>'user_id')::uuid,
      (trace_item->>'sequence')::integer, trace_item->>'tool_name',
      trace_item->'arguments', nullif(trace_item->'result_summary', 'null'::jsonb),
      trace_item->>'status', (trace_item->>'latency_ms')::integer,
      trace_item->>'error_message'
    );
  end loop;
end;
$$;

revoke all on function public.record_ai_tutor_run(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_ai_tutor_run(jsonb, jsonb) to service_role;
