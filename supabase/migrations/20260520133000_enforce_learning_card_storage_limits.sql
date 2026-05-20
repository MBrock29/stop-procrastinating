create or replace function public.enforce_learning_card_storage_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  allowed_cards integer;
  existing_count integer;
begin
  select coalesce(
    (
      select plan_tier
      from public.user_ai_settings
      where user_id = new.user_id
      limit 1
    ),
    'free'
  )
  into current_plan;

  allowed_cards := case current_plan
    when 'free' then 100
    when 'pro' then 2500
    when 'premium' then 10000
    when 'byok' then 500
    else 100
  end;

  select count(*)
  into existing_count
  from public.learning_cards
  where user_id = new.user_id;

  if existing_count >= allowed_cards then
    raise exception
      'Learning card storage limit reached for the current plan. This plan allows up to % cards.',
      allowed_cards
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_learning_card_storage_limit_before_insert
  on public.learning_cards;

create trigger enforce_learning_card_storage_limit_before_insert
before insert on public.learning_cards
for each row
execute function public.enforce_learning_card_storage_limit();
