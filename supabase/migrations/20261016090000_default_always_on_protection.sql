-- Preserve previously chosen hours; new sites are protected all day, every day.
alter table public.blocked_domains
  add column schedule_all_day boolean not null default false;

alter table public.blocked_domains
  alter column schedule_all_day set default true,
  alter column schedule_days set default '{0,1,2,3,4,5,6}';

comment on column public.blocked_domains.schedule_all_day is
  'When true, protect every instant of each selected local day, including midnight.';
