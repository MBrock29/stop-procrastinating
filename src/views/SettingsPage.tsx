import { useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { canAccessByok } from '../features/ai-access/byokVisibility'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import { useBillingAccount } from '../features/billing/useBillingAccount'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import { usePricingCurrency } from '../features/pricing/usePricingCurrency'
import { isPublicPaidTier } from '../features/product/publicPlans'

export function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, session, signOut, user } = useAuth()
  const {
    byokCredentialStatus,
    clearByokCredentials,
    settings,
    updateSettings,
    isLoading,
  } = useAiAccess()
  const { domains } = useBlockedDomains()
  const { cards } = useLearningCards()
  const extensionStatus = useExtensionStatus()
  const {
    billingAccount,
    openPortal,
    startCheckout,
    isLoading: isBillingLoading,
  } = useBillingAccount()
  const { currency } = usePricingCurrency()
  const [pending, setPending] = useState(false)
  const [billingCadence, setBillingCadence] = useState<'month' | 'year'>('month')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeDomains = domains.filter((item) => item.isActive).length
  const activeCards = cards.filter((item) => !item.isArchived).length
  const showByok = canAccessByok(user?.email)
  const authProvider =
    session?.user.app_metadata.provider ??
    (mode === 'demo' ? 'demo' : 'email')
  const billingQueryMessage = new URLSearchParams(location.search).get('billing')
  const hasManagedSubscription =
    billingAccount?.subscriptionStatus === 'active' ||
    billingAccount?.subscriptionStatus === 'trialing' ||
    billingAccount?.subscriptionStatus === 'past_due'
  const hasStripeSubscription = Boolean(billingAccount?.stripeSubscriptionId)
  const hasEntitledPaidAccess =
    isPublicPaidTier(settings.planTier) &&
    !hasManagedSubscription &&
    !hasStripeSubscription
  const currentPlanLabel = isPublicPaidTier(settings.planTier)
    ? 'Better Focus Pro'
    : 'Free'
  const nextBillingDate = billingAccount?.currentPeriodEnd
    ? new Date(billingAccount.currentPeriodEnd).toLocaleDateString()
    : null

  async function handleClearByok() {
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await clearByokCredentials()
      setMessage('Saved BYOK key removed from your account.')
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : 'Unable to clear your BYOK key.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handleSignOutEverywhere() {
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await signOut()
      navigate('/')
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error ? nextError.message : 'Unable to sign out right now.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handleOpenBillingPortal() {
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await openPortal()
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to open the billing portal right now.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handleStartCheckout(planTier: 'pro' | 'premium') {
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await startCheckout({
        planTier,
        billingInterval: billingCadence,
        currency,
      })
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to open checkout right now.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handlePremiumInterruptModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value === 'summary' ? 'summary' : 'cards'

    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await updateSettings({ premiumInterruptMode: nextMode })
      setMessage(
        nextMode === 'summary'
          ? 'Interruptions now open with a saved summary first when one is available.'
          : 'Interruptions now open straight into questions.',
      )
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update your premium interrupt mode.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handleRedirectBackModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value === 'after_cards' ? 'after_cards' : 'manual'

    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await updateSettings({ redirectBackMode: nextMode })
      setMessage(
        nextMode === 'after_cards'
          ? 'Automatic return is now enabled for redirect sessions.'
          : 'Automatic return is now turned off.',
      )
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update your redirect return setting.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  async function handleRedirectBackCardCountChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextValue = Number(event.target.value)

    if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 20) {
      setError('Choose a whole number of cards between 1 and 20.')
      return
    }

    setPending(true)
    setError(null)
    setMessage(null)

    try {
      await updateSettings({ redirectBackCardCount: nextValue })
      setMessage(`Users will now return after ${nextValue} reviewed card${nextValue === 1 ? '' : 's'}.`)
    } catch (nextError) {
      const nextMessage =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update your redirect return count.'
      setError(nextMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="section-kicker">Settings</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
          Keep your account and setup in good shape.
        </h2>
        <p className="muted-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">
          Review your sign-in details, plan, and interruption preferences from one place.
        </p>

        {message || billingQueryMessage === 'success' ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message ?? 'Checkout completed. Billing details will appear here once Stripe confirms the subscription.'}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Signed in as
            </div>
            <div className="mt-3 text-lg font-bold text-ink dark:text-white">
              {user?.email ?? 'Unknown user'}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Provider: {authProvider}
            </div>
          </div>
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Current plan
            </div>
            <div className="mt-3 text-lg font-bold text-ink dark:text-white">
              {currentPlanLabel}
            </div>
          </div>
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Active blocks
            </div>
            <div className="mt-3 text-3xl font-bold text-ink dark:text-white">{activeDomains}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Active cards
            </div>
            <div className="mt-3 text-3xl font-bold text-ink dark:text-white">{activeCards}</div>
          </div>
        </div>

        <div className="soft-card mt-6 p-5">
          <h3 className="text-lg font-bold text-ink dark:text-white">Plan management</h3>
          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-ink dark:text-white">
                  {hasManagedSubscription
                    ? billingAccount?.cancelAtPeriodEnd
                      ? `Your ${currentPlanLabel} plan stays active until ${nextBillingDate ?? 'the end of the current billing period'}`
                      : `${currentPlanLabel} billing is active on this account`
                    : hasEntitledPaidAccess
                      ? `${currentPlanLabel} access is enabled on this account`
                    : `You are currently on ${currentPlanLabel}`}
                </div>
                <div className="muted-copy mt-2 leading-6">
                  {hasManagedSubscription
                    ? billingAccount?.currentPeriodEnd
                      ? `Status: ${billingAccount.subscriptionStatus}. Changes, downgrades, and cancellations are managed in Stripe. ${
                          billingAccount.cancelAtPeriodEnd
                            ? 'Your access will end at the close of the current billing period.'
                            : 'Upgrades can take effect straight away, while downgrades and cancellations stay active until the end of the billing period.'
                        }`
                      : `Status: ${billingAccount?.subscriptionStatus}.`
                    : hasEntitledPaidAccess
                      ? 'This account currently has paid access enabled outside Stripe, so there is no subscription to cancel, downgrade, or invoice history to manage in the billing portal.'
                    : 'Start a paid plan here, then use Stripe billing to upgrade, downgrade, change billing cadence, or cancel later.'}
                </div>
              </div>
              <div className="rounded-full bg-[var(--app-surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {billingAccount?.billingInterval === 'year'
                  ? 'Annual billing'
                  : billingAccount?.billingInterval === 'month'
                    ? 'Monthly billing'
                    : billingCadence === 'year'
                      ? 'Annual selected'
                      : 'Monthly selected'}
              </div>
            </div>

            {!hasManagedSubscription ? (
              <div className="mt-5 inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
                <button
                  type="button"
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    billingCadence === 'month'
                      ? 'bg-reef text-white shadow-lg shadow-reef/20'
                      : 'text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]',
                  ].join(' ')}
                  onClick={() => setBillingCadence('month')}
                  disabled={pending || isBillingLoading}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    billingCadence === 'year'
                      ? 'bg-reef text-white shadow-lg shadow-reef/20'
                      : 'text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]',
                  ].join(' ')}
                  onClick={() => setBillingCadence('year')}
                  disabled={pending || isBillingLoading}
                >
                  Annual
                </button>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {!isPublicPaidTier(settings.planTier) ? (
                <button
                  type="button"
                  className="action-button"
                  onClick={() => void handleStartCheckout('premium')}
                  disabled={pending || isBillingLoading}
                >
                  Choose Better Focus Pro
                </button>
              ) : null}

              {isPublicPaidTier(settings.planTier) ? (
                hasManagedSubscription ? (
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void handleOpenBillingPortal()}
                    disabled={pending || isBillingLoading}
                  >
                    Manage plan
                  </button>
                ) : hasEntitledPaidAccess ? (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled
                  >
                    Included access
                  </button>
                ) : (
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void handleStartCheckout('premium')}
                    disabled={pending || isBillingLoading}
                  >
                    Start Better Focus Pro billing
                  </button>
                )
              ) : null}

              <Link to="/app/pricing" className="ghost-button">
                Compare plan details
              </Link>
            </div>

            {hasManagedSubscription ? (
              <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Open Stripe billing to upgrade, downgrade, switch between monthly and annual billing, or cancel. Downgrades and cancellations remain active until the current billing period ends.
              </div>
            ) : null}

            {!hasManagedSubscription ? (
              <div className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-300">
                New subscriptions will open in Stripe Checkout using your local pricing currency ({currency.toUpperCase()}).
              </div>
            ) : null}
          </div>
        </div>

        <div className="soft-card mt-6 p-5">
          <h3 className="text-lg font-bold text-ink dark:text-white">Billing history</h3>
          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
            <div className="font-semibold text-ink dark:text-white">
              {hasManagedSubscription
                ? 'Invoices, payment methods, and cancellation all live in Stripe billing.'
                : 'Billing history appears once you start a paid subscription.'}
            </div>
            <div className="muted-copy mt-2 leading-6">
              {hasManagedSubscription
                ? 'Use the billing portal whenever you need receipts, card changes, or a clean place to manage your subscription.'
                : 'There is nothing to manage yet on this account.'}
            </div>
            {hasManagedSubscription ? (
              <div className="mt-4">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleOpenBillingPortal()}
                  disabled={pending || isBillingLoading}
                >
                  Open billing portal
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="soft-card mt-6 p-5">
          <h3 className="text-lg font-bold text-ink dark:text-white">Security and privacy</h3>
          <ul className="muted-copy mt-4 space-y-3 text-sm leading-6">
            {showByok ? (
              <li>Your BYOK key is stored against your account in encrypted form and is only used inside Supabase Edge Functions.</li>
            ) : null}
            {showByok ? (
              <li>The app never shows the full saved key back to the browser after it is stored.</li>
            ) : null}
            <li>The browser extension stores synced blocked domains locally in Chrome so redirects can happen quickly.</li>
            {showByok ? (
              <li>Using BYOK moves LLM request costs to your own provider account, but your product data still lives in Supabase.</li>
            ) : null}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/setup" className="action-button">
            Open setup guide
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <div className="panel px-6 py-6 sm:px-8">
          <h3 className="text-lg font-bold text-ink dark:text-white">Extension</h3>
          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
            <div className="font-semibold text-ink dark:text-white">
              {extensionStatus.status === 'connected'
                ? extensionStatus.isStale
                  ? 'Connected, but sync looks stale'
                  : 'Connected'
                : extensionStatus.status === 'checking'
                  ? 'Checking connection'
                  : 'Not connected'}
            </div>
            <div className="muted-copy mt-2 leading-6">
              {extensionStatus.status === 'connected'
                ? `The extension currently has ${extensionStatus.details?.blockedDomains.length ?? 0} synced blocked domain${(extensionStatus.details?.blockedDomains.length ?? 0) === 1 ? '' : 's'}.`
                : 'Open Chrome with the extension installed, then use the blocked-sites page to sync your active rules.'}
            </div>
            {extensionStatus.details?.lastSyncedAt ? (
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                Last synced {new Date(extensionStatus.details.lastSyncedAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
            <div className="font-semibold text-ink dark:text-white">
              Redirect actions
            </div>
            <p className="muted-copy mt-2 leading-6">
              Every interruption includes a clear “Continue anyway” action. Better
              Focus adds a useful pause without trapping you.
            </p>

            <div className="mt-4 border-t border-[var(--app-border)] pt-5">
              <div className="font-semibold text-ink dark:text-white">
                Automatic return
              </div>
              <p className="muted-copy mt-2 leading-6">
                Choose whether Better Focus should send users back to the original
                blocked site automatically after they review a set number of cards.
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block font-semibold text-ink dark:text-white">
                  Redirect return mode
                </span>
                <select
                  value={settings.redirectBackMode}
                  onChange={(event) => void handleRedirectBackModeChange(event)}
                  disabled={pending || isLoading}
                  className="app-input"
                >
                  <option value="manual">Off</option>
                  <option value="after_cards">Return after cards answered</option>
                </select>
              </label>
              {settings.redirectBackMode === 'after_cards' ? (
                <label className="mt-4 block">
                  <span className="mb-2 block font-semibold text-ink dark:text-white">
                    Cards before return
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={settings.redirectBackCardCount}
                    onChange={(event) => void handleRedirectBackCardCountChange(event)}
                    disabled={pending || isLoading}
                    className="app-input max-w-[12rem]"
                  />
                  <span className="muted-copy mt-2 block leading-6">
                    Better Focus will return users after they answer this many cards in a redirect session.
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          {isPublicPaidTier(settings.planTier) ? (
            <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
              <div className="font-semibold text-ink dark:text-white">
                Learning challenge format
              </div>
              <p className="muted-copy mt-2 leading-6">
                Choose whether interruptions open with quick questions or a saved
                topic summary when one is available.
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block font-semibold text-ink dark:text-white">
                  Redirect format
                </span>
                <select
                  value={settings.premiumInterruptMode}
                  onChange={(event) => void handlePremiumInterruptModeChange(event)}
                  disabled={pending || isLoading}
                  className="app-input"
                >
                  <option value="cards">Cards first</option>
                  <option value="summary">Summary first</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        {showByok ? (
        <div className="panel px-6 py-6 sm:px-8">
          <h3 className="text-lg font-bold text-ink dark:text-white">BYOK</h3>
          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
            <div className="font-semibold text-ink dark:text-white">
              {byokCredentialStatus
                ? `Saved ${byokCredentialStatus.provider} key ending ${byokCredentialStatus.lastFour}`
                : 'No saved BYOK key'}
            </div>
            <div className="muted-copy mt-2 leading-6">
              {byokCredentialStatus
                ? `Saved on ${new Date(byokCredentialStatus.updatedAt).toLocaleString()}.`
                : 'If you want cross-device BYOK, add your provider key on the BYOK page.'}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/app/byok" className="action-button">
                Open BYOK settings
              </Link>
              <button
                type="button"
                className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleClearByok()}
                disabled={!byokCredentialStatus || pending}
              >
                Clear saved BYOK key
              </button>
            </div>
          </div>
        </div>
        ) : null}

        <div className="panel px-6 py-6 sm:px-8">
          <h3 className="text-lg font-bold text-ink dark:text-white">Account actions</h3>
          <p className="muted-copy mt-3 text-sm leading-6">
            Sign out here if you are on a shared device or want to reconnect your session cleanly.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="action-button"
              onClick={() => void handleSignOutEverywhere()}
              disabled={pending}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
