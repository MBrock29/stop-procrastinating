create table if not exists public.user_billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_tier text not null default 'free',
  billing_interval text,
  billing_currency text,
  subscription_status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_billing_accounts_plan_tier_check
    check (plan_tier in ('free', 'pro', 'premium')),
  constraint user_billing_accounts_billing_interval_check
    check (billing_interval is null or billing_interval in ('month', 'year'))
);

create index if not exists user_billing_accounts_subscription_idx
  on public.user_billing_accounts (stripe_subscription_id);

create index if not exists user_billing_accounts_customer_idx
  on public.user_billing_accounts (stripe_customer_id);

alter table public.user_billing_accounts enable row level security;

create policy "billing accounts are viewable by owner"
  on public.user_billing_accounts
  for select
  using (auth.uid() = user_id);
