import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAiAccess } from '../features/ai-access/useAiAccess';
import { canAccessPremium } from '../features/ai-access/byokVisibility';
import { useAuth } from '../features/auth/useAuth';
import {
  type PricingCurrency,
  usePricingCurrency,
} from '../features/pricing/usePricingCurrency';
import type { PlanTier } from '../types/domain';

type BillingCadence = 'monthly' | 'annual';

interface PlanCardDefinition {
  tier: PlanTier;
  title: string;
  price: string;
  cadenceLabel: string;
  priceClassName?: string;
  priceRowClassName?: string;
  benefits: string[];
  ctaLabel: string;
  ctaKind: 'current' | 'coming-soon' | 'contact';
  badge?: string;
  secondaryBadge?: string;
}

export function PricingPage() {
  const { user } = useAuth();
  const { isLoading, settings } = useAiAccess();
  const [billingCadence, setBillingCadence] =
    useState<BillingCadence>('monthly');
  const { currency, setCurrency, prices } = usePricingCurrency();
  const canUsePremium = canAccessPremium(user?.email);

  const planCards = useMemo<PlanCardDefinition[]>(() => {
    const proPrice =
      billingCadence === 'monthly' ? prices.proMonthly : prices.proAnnual;
    const proCadenceLabel = billingCadence === 'monthly' ? '/month' : '/year';
    const premiumPrice =
      billingCadence === 'monthly'
        ? prices.premiumMonthly
        : prices.premiumAnnual;
    const premiumCadenceLabel =
      billingCadence === 'monthly' ? '/month' : '/year';

    const cards: PlanCardDefinition[] = [
      {
        tier: 'free',
        title: 'Free',
        price: prices.freeMonthly,
        cadenceLabel: '/month',
        benefits: [
          'Store up to 100 cards',
          'Generate up to 3 packs per month',
          'Generate up to 10 cards per pack',
          'Access to the lighter hosted language learning model',
        ],
        ctaLabel: settings.planTier === 'free' ? 'Current plan' : 'Not active',
        ctaKind: settings.planTier === 'free' ? 'current' : 'coming-soon',
      },
      {
        tier: 'pro',
        title: 'Pro',
        price: proPrice,
        cadenceLabel: proCadenceLabel,
        benefits: [
          'Store up to 2,500 cards',
          'Generate up to 25 packs per month',
          'Generate up to 100 cards per pack',
          'Access to a stronger model',
        ],
        ctaLabel:
          settings.planTier === 'pro' ? 'Current plan' : 'Billing coming soon',
        ctaKind: settings.planTier === 'pro' ? 'current' : 'coming-soon',
        badge:
          billingCadence === 'monthly'
            ? 'Annual discount available'
            : 'Popular',
        secondaryBadge:
          billingCadence === 'annual' ? '12 months for 10' : undefined,
      },
      {
        tier: 'premium',
        title: 'Premium',
        price: premiumPrice,
        cadenceLabel: premiumCadenceLabel,
        benefits: [
          'Store up to 10,000 cards',
          'Generate up to 100 packs per month',
          'Generate up to 100 cards per pack',
          'Access to our strongest model',
          'Generate deeper follow-up packs from any topic',
          'Generate pack summaries to solidify learning',
          'Unlock weekly progress charts',
          'See confidence breakdowns across every review',
          'Spot strongest and weakest topics instantly',
        ],
        ctaLabel:
          settings.planTier === 'premium'
            ? 'Current plan'
            : canUsePremium
              ? 'Included on your account'
              : 'Premium coming soon',
        ctaKind: settings.planTier === 'premium'
          ? 'current'
          : canUsePremium
            ? 'contact'
            : 'coming-soon',
        badge:
          billingCadence === 'monthly'
            ? 'Annual discount available'
            : 'Best value',
        secondaryBadge:
          billingCadence === 'annual' ? '12 months for 10' : undefined,
      },
    ];

    return cards;
  }, [
    billingCadence,
    canUsePremium,
    prices.freeMonthly,
    prices.premiumAnnual,
    prices.premiumMonthly,
    prices.proAnnual,
    prices.proMonthly,
    settings.planTier,
  ]);

  return (
    <div className='space-y-6'>
      <section className='overflow-hidden'>
        <div className='flex flex-wrap justify-end gap-3'>
          <div className='soft-card inline-flex p-1'>
            {(['monthly', 'annual'] as BillingCadence[]).map((cadence) => (
              <button
                key={cadence}
                type='button'
                onClick={() => setBillingCadence(cadence)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  billingCadence === cadence
                    ? 'bg-reef text-white shadow-lg shadow-reef/20'
                    : 'text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]',
                ].join(' ')}
              >
                {cadence === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
          <div className='soft-card inline-flex p-1'>
            {(['USD', 'GBP', 'EUR'] as PricingCurrency[]).map(
              (nextCurrency) => (
                <button
                  key={nextCurrency}
                  type='button'
                  onClick={() => setCurrency(nextCurrency)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    currency === nextCurrency
                      ? 'bg-reef text-white shadow-lg shadow-reef/20'
                      : 'text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]',
                  ].join(' ')}
                >
                  {nextCurrency}
                </button>
              ),
            )}
          </div>
        </div>
        <div className='mt-8 grid gap-4 xl:grid-cols-3'>
          {planCards.map((plan) => {
            const isCurrent = !isLoading && settings.planTier === plan.tier;

            return (
              <article
                key={plan.tier}
                className={[
                  'relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6',
                  'border-[var(--app-border)] bg-[var(--app-surface-muted)]',
                ].join(' ')}
              >
                {plan.badge || plan.secondaryBadge ? (
                  <div className='absolute right-4 top-4 flex flex-col items-end gap-2'>
                    {plan.badge ? (
                      <div
                        className={[
                          'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                          plan.secondaryBadge
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-400 text-slate-900',
                        ].join(' ')}
                      >
                        {plan.badge}
                      </div>
                    ) : null}
                    {plan.secondaryBadge ? (
                      <div className='rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-900'>
                        {plan.secondaryBadge}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className='min-h-[7.5rem]'>
                  <h3 className='text-2xl font-extrabold tracking-tight text-ink dark:text-white'>
                    {plan.title}
                  </h3>
                  <div
                    className={[
                      'mt-4 flex min-h-[3.5rem] gap-2',
                      plan.priceRowClassName ?? 'items-end',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'font-extrabold tracking-tight text-ink dark:text-white',
                        plan.priceClassName ?? 'text-4xl',
                      ].join(' ')}
                    >
                      {plan.price}
                    </span>
                    {plan.cadenceLabel ? (
                      <span className='pb-1 text-sm font-semibold text-slate-500 dark:text-slate-300'>
                        {plan.cadenceLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <ul className='mt-2 space-y-3 text-sm text-slate-700 dark:text-slate-200'>
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className='flex items-start gap-3'>
                      <span className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-reef/12 text-sm font-bold text-reef'>
                        ✓
                      </span>
                      <span className='flex-1 font-semibold leading-6'>
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className='mt-auto pt-6'>
                  {plan.ctaKind === 'contact' ? (
                    <Link
                      to='/contact'
                      className='ghost-button min-h-[44px] w-full px-4 py-2 text-sm'
                    >
                      {isLoading ? 'Loading…' : plan.ctaLabel}
                    </Link>
                  ) : (
                    <button
                      type='button'
                      className={[
                        isCurrent ? 'action-button' : 'ghost-button',
                        'min-h-[44px] w-full px-4 py-2 text-sm',
                      ].join(' ')}
                      disabled
                    >
                      {isLoading ? 'Loading…' : plan.ctaLabel}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
