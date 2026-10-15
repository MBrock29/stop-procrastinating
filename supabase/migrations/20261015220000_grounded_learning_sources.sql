create extension if not exists vector;

create table public.learning_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  source_type text not null check (source_type in ('text', 'notes', 'url', 'document')),
  source_url text,
  content_hash text not null check (length(content_hash) = 64),
  status text not null check (status in ('processing', 'ready', 'failed')),
  chunk_count integer not null default 0 check (chunk_count >= 0),
  embedding_model text not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, content_hash),
  unique(id, user_id)
);

create table public.learning_source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(trim(content)) > 0),
  token_estimate integer not null check (token_estimate > 0),
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique(source_id, chunk_index),
  foreign key(source_id, user_id) references public.learning_sources(id, user_id) on delete cascade
);
create index learning_sources_user_created_idx on public.learning_sources(user_id, created_at desc);
create index learning_source_chunks_source_idx on public.learning_source_chunks(source_id, chunk_index);
create index learning_source_chunks_embedding_idx on public.learning_source_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.learning_sources enable row level security;
alter table public.learning_source_chunks enable row level security;
create policy "Owners read learning sources" on public.learning_sources for select
  to authenticated using (auth.uid() = user_id);
create policy "Owners delete learning sources" on public.learning_sources for delete
  to authenticated using (auth.uid() = user_id);
create policy "Owners read learning chunks" on public.learning_source_chunks for select
  to authenticated using (auth.uid() = user_id);
revoke all on public.learning_sources from anon, authenticated;
revoke all on public.learning_source_chunks from anon, authenticated;
grant select, delete on public.learning_sources to authenticated;
grant select on public.learning_source_chunks to authenticated;

alter table public.learning_cards
  add column grounded_source_id uuid references public.learning_sources(id) on delete set null,
  add column citation_chunk_ids uuid[] not null default '{}',
  add column citation_excerpts text[] not null default '{}',
  add column grounding_score numeric(5,2) check (grounding_score between 0 and 100);

create function public.match_learning_source_chunks(
  p_query_embedding vector(1536), p_match_count integer default 8, p_source_id uuid default null
)
returns table(id uuid, source_id uuid, chunk_index integer, content text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.source_id, c.chunk_index, c.content,
    1 - (c.embedding operator(public.<=>) p_query_embedding) as similarity
  from public.learning_source_chunks c
  where c.user_id = auth.uid()
    and (p_source_id is null or c.source_id = p_source_id)
  order by c.embedding operator(public.<=>) p_query_embedding
  limit greatest(1, least(p_match_count, 20));
$$;
revoke all on function public.match_learning_source_chunks(vector, integer, uuid) from public, anon;
grant execute on function public.match_learning_source_chunks(vector, integer, uuid) to authenticated;

create table public.grounded_generation_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.learning_sources(id) on delete set null,
  topic text not null,
  model text not null,
  embedding_model text not null,
  prompt_version text not null,
  retrieved_chunk_ids uuid[] not null default '{}',
  retrieved_similarities double precision[] not null default '{}',
  card_count integer not null default 0 check (card_count >= 0),
  grounding_pass_rate numeric(5,2) check (grounding_pass_rate between 0 and 100),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd >= 0),
  status text not null check (status in ('success', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);
alter table public.grounded_generation_events enable row level security;
create policy "Owners read grounded events" on public.grounded_generation_events for select
  to authenticated using (auth.uid() = user_id);
revoke all on public.grounded_generation_events from anon, authenticated;
grant select on public.grounded_generation_events to authenticated;

create function public.persist_grounded_generation(p_event jsonb, p_cards jsonb)
returns void language plpgsql set search_path = '' as $$
declare card jsonb;
begin
  if not exists (select 1 from public.learning_sources s
    where s.id = (p_event->>'source_id')::uuid and s.user_id = (p_event->>'user_id')::uuid and s.status = 'ready') then
    raise exception 'Source ownership validation failed';
  end if;
  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) < 1 then
    raise exception 'Grounded cards are required';
  end if;
  for card in select value from jsonb_array_elements(p_cards)
  loop
    insert into public.learning_cards(user_id, question, answer, source, generation_topic,
      is_user_edited, grounded_source_id, citation_chunk_ids, citation_excerpts, grounding_score)
    values((p_event->>'user_id')::uuid, card->>'question', card->>'answer', 'ai',
      p_event->>'topic', false, (p_event->>'source_id')::uuid,
      array(select value::uuid from jsonb_array_elements_text(card->'citation_chunk_ids')),
      array(select value from jsonb_array_elements_text(card->'citation_excerpts')),
      (card->>'grounding_score')::numeric);
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
end;
$$;
revoke all on function public.persist_grounded_generation(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_grounded_generation(jsonb, jsonb) to service_role;
