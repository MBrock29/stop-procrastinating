import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { isByokPubliclyVisible } from '../features/ai-access/byokVisibility';
import { SiteFooter } from '../ui/SiteFooter';

type BillingCadence = 'monthly' | 'annual';

const flowSteps = [
  'Install the Chrome extension.',
  'Generate cards for your account with AI.',
  'Add websites you wish to redirect.',
  'Learn from as little as one card at a time.',
  'New and lower-confidence cards surface first to prioritise learning.',
];

export function AuthPage() {
  const { status } = useAuth();
  const [billingCadence, setBillingCadence] =
    useState<BillingCadence>('monthly');
  const showByok = isByokPubliclyVisible();

  const planCards = [
    {
      title: 'Free',
      price: '$0',
      cadence: '/month',
      benefits: [
        'Store up to 100 cards',
        'Generate up to 3 packs per month',
        'Generate up to 10 cards per pack',
        'Access to our basic model',
      ],
    },
    {
      title: 'Pro',
      price: billingCadence === 'monthly' ? '$3.99' : '$39.90',
      cadence: billingCadence === 'monthly' ? '/month' : '/year',
      badge:
        billingCadence === 'monthly'
          ? 'Annual discount available'
          : 'Best value',
      benefits: [
        'Store up to 500 cards',
        'Generate up to 25 packs per month',
        'Generate up to 100 cards per pack',
        'Access to our strongest model',
      ],
    },
    {
      title: 'Premium',
      price: billingCadence === 'monthly' ? '$9.99' : '$99.90',
      cadence: billingCadence === 'monthly' ? '/month' : '/year',
      badge:
        billingCadence === 'monthly'
          ? 'Advanced learning tools'
          : 'Best for serious learners',
      benefits: [
        'Store up to 1,000 cards',
        'Generate up to 100 packs per month',
        'Generate up to 100 cards per pack',
        'Unlock summaries, charts, and deeper practice',
      ],
    },
    {
      title: 'Bring your own key',
      price: 'Billed by your own provider',
      cadence: '',
      benefits: [
        'Store up to 500 cards',
        'Generate unlimited packs per month',
        'Generate up to 100 cards per pack',
        'Choose your own model',
      ],
    },
  ].filter((plan) => showByok || plan.title !== 'Bring your own key');

  if (status === 'authenticated') {
    return <Navigate to='/app' replace />;
  }

  return (
    <div className='min-h-screen px-4 py-10 sm:px-6 lg:px-8'>
      <div className='mx-auto flex w-full max-w-6xl justify-end gap-3 pb-4'>
        <Link
          to='/login?mode=register'
          className='action-button px-4 py-2 text-sm'
        >
          Create account
        </Link>
        <Link to='/login' className='ghost-button px-4 py-2 text-sm'>
          Sign in
        </Link>
      </div>

      <div className='mx-auto max-w-6xl space-y-8'>
        <section className='panel overflow-hidden px-8 py-9 sm:px-10 sm:py-10'>
          <p className='text-lg font-extrabold uppercase tracking-[0.28em] text-reef sm:text-xl'>
            Better Focus
          </p>
          <div className='mt-4'>
            <h1 className='text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-5xl'>
              Turn drift into deliberate practice.
            </h1>
            <p className='muted-copy mt-5 w-full text-base leading-7 sm:text-lg'>
              This app pairs a Chrome browser extension with your own
              question-and-answer cards so every impulse visit becomes a short,
              useful learning moment.
            </p>
          </div>
        </section>

        <section>
          <div className='px-1'>
            <p className='section-kicker'>How It Works</p>
            <h2 className='mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl'>
              Five small steps from distraction to progress.
            </h2>
          </div>
          <div className='mt-6 grid gap-4 lg:grid-cols-5'>
            {flowSteps.map((step, index) => (
              <div key={step} className='relative'>
                {index < flowSteps.length - 1 ? (
                  <div className='absolute left-[calc(50%+1.75rem)] right-[-1rem] top-7 hidden h-px bg-gradient-to-r from-reef/40 to-sky-400/25 lg:block' />
                ) : null}
                <div className='soft-card relative h-full min-h-[150px] px-5 py-5'>
                  <div className='flex items-center gap-3'>
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-reef text-sm font-bold text-white shadow-sm shadow-reef/20'>
                      {index + 1}
                    </span>
                  </div>
                  <p className='mt-4 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200 sm:text-base'>
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className='px-1'>
            <p className='section-kicker'>Pricing</p>
            <h2 className='mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl'>
              Choose the plan that fits your pace.
            </h2>
          </div>
          <div className='mt-6 overflow-hidden'>
            <div className='flex justify-end'>
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
            </div>
            <div className='mt-6 grid gap-4 xl:grid-cols-3'>
              {planCards.map((plan) => (
                <article
                  key={plan.title}
                  className={[
                    'relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6',
                    'border-[var(--app-border)] bg-[var(--app-surface-muted)]',
                  ].join(' ')}
                >
                  {plan.badge ? (
                    <div className='absolute right-4 top-4 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-900'>
                      {plan.badge}
                    </div>
                  ) : null}

                  <div className='min-h-[7.5rem]'>
                    <h3 className='text-2xl font-extrabold tracking-tight text-ink dark:text-white'>
                      {plan.title}
                    </h3>
                    <div className='mt-4 flex min-h-[3.5rem] items-end gap-2'>
                      <span
                        className={
                          plan.title === 'Bring your own key'
                            ? 'self-end pb-1 text-sm font-semibold text-slate-500 dark:text-slate-300'
                            : 'text-4xl font-extrabold tracking-tight text-ink dark:text-white'
                        }
                      >
                        {plan.price}
                      </span>
                      {plan.cadence ? (
                        <span className='pb-1 text-sm font-semibold text-slate-500 dark:text-slate-300'>
                          {plan.cadence}
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
                        <span className='flex-1 font-semibold leading-6'>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <div className='mt-auto pt-6'>
                    <Link
                      to='/login'
                      className='action-button min-h-[44px] w-full px-4 py-2 text-sm'
                    >
                      Get started
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter className='mx-auto max-w-6xl' />
    </div>
  );
}
