alter table public.user_ai_settings
  add column if not exists show_continue_to_site_button boolean not null default true;

update public.user_ai_settings
set show_continue_to_site_button = true
where show_continue_to_site_button is null;
