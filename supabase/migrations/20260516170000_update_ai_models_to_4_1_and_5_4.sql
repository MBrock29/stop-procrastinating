update public.user_ai_settings
set preferred_model = 'gpt-4.1-mini'
where preferred_model = 'gpt-4o-mini';

alter table public.user_ai_settings
  alter column preferred_model set default 'gpt-4.1-mini';

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_preferred_model_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_preferred_model_check
    check (preferred_model in ('gpt-4.1-mini', 'gpt-5.4-mini'));
