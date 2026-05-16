alter table public.user_ai_settings
  add column if not exists redirect_back_mode text not null default 'manual',
  add column if not exists redirect_back_card_count integer not null default 1;

update public.user_ai_settings
set redirect_back_mode = 'manual'
where redirect_back_mode is null;

update public.user_ai_settings
set redirect_back_card_count = 1
where redirect_back_card_count is null or redirect_back_card_count < 1;

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_redirect_back_mode_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_redirect_back_mode_check
    check (redirect_back_mode in ('manual', 'after_cards'));

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_redirect_back_card_count_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_redirect_back_card_count_check
    check (redirect_back_card_count >= 1 and redirect_back_card_count <= 20);
