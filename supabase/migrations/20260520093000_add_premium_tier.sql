alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_plan_tier_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_plan_tier_check
    check (plan_tier in ('free', 'pro', 'premium', 'byok'));

alter table public.ai_generation_events
  drop constraint if exists ai_generation_events_plan_tier_check;

alter table public.ai_generation_events
  add constraint ai_generation_events_plan_tier_check
    check (plan_tier in ('free', 'pro', 'premium', 'byok'));
