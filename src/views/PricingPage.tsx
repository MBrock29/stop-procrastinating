import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import { useBillingAccount } from '../features/billing/useBillingAccount'
import { usePricingCurrency } from '../features/pricing/usePricingCurrency'
import { isPublicPaidTier, PUBLIC_PLANS } from '../features/product/publicPlans'
import { trackProductEvent } from '../features/product/productExperience'

export function PricingPage() {
  const location = useLocation(); const { user } = useAuth(); const { settings, isLoading } = useAiAccess()
  const { billingAccount, error: billingError, startCheckout, openPortal } = useBillingAccount()
  const { currency, prices } = usePricingCurrency(); const [cadence, setCadence] = useState<'monthly'|'annual'>('monthly')
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  const isPaid = isPublicPaidTier(settings.planTier)
  const managed = ['active','trialing','past_due'].includes(billingAccount?.subscriptionStatus ?? '')
  const paidPrice = cadence === 'monthly' ? prices.premiumMonthly : prices.premiumAnnual
  const cancelled = new URLSearchParams(location.search).get('billing') === 'cancelled'

  async function paidAction() {
    setBusy(true); setError(null)
    try {
      if (managed && billingAccount?.stripeSubscriptionId) await openPortal()
      else if (!isPaid) {
        if (user) void trackProductEvent(user.id, 'upgrade_clicked', { cadence })
        await startCheckout({ planTier: 'premium', billingInterval: cadence === 'monthly' ? 'month' : 'year', currency })
      }
    } catch (next) { setError(next instanceof Error ? next.message : 'Unable to open billing.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6"><section className="panel p-6 sm:p-8"><p className="section-kicker">Simple pricing</p><h1 className="mt-3 text-3xl font-extrabold">Start with the whole habit loop. Upgrade for personalisation.</h1><p className="muted-copy mt-4 max-w-3xl leading-7">Use Better Focus for free, then upgrade when you want more personal guidance and learning from your own material.</p>
    <div className="mt-6 soft-card inline-flex p-1">{(['monthly','annual'] as const).map(item => <button key={item} type="button" onClick={() => setCadence(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${cadence === item ? 'bg-reef text-white' : ''}`}>{item === 'monthly' ? 'Monthly' : 'Annual'}</button>)}</div>
    {cancelled ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Checkout was cancelled. No billing changes were made.</div> : null}
    {error || billingError ? <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error ?? billingError}</div> : null}
    {settings.planTier === 'pro' ? <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Your existing plan remains active. New customers see the simplified Better Focus Pro offer; use the billing portal for subscription changes.</div> : null}
  </section>
  <section className="grid gap-5 md:grid-cols-2"><h2 className="sr-only">Compare Free and Better Focus Pro</h2>{[
    { key: 'free', ...PUBLIC_PLANS.free, price: prices.freeMonthly, suffix: '/month' },
    { key: 'paid', ...PUBLIC_PLANS.paid, price: paidPrice, suffix: cadence === 'monthly' ? '/month' : '/year' },
  ].map(plan => <article key={plan.key} className="panel flex flex-col p-7"><div><h3 className="text-2xl font-extrabold">{plan.name}</h3><p className="muted-copy mt-2 text-sm leading-6">{plan.description}</p><div className="mt-6"><span className="text-4xl font-extrabold">{plan.price}</span><span className="muted-copy ml-2 text-sm">{plan.suffix}</span></div></div><ul className="mt-7 flex-1 space-y-3">{plan.benefits.map(item => <li key={item} className="flex gap-3 text-sm leading-6"><span className="font-bold text-reef">✓</span>{item}</li>)}</ul>
    {plan.key === 'free' ? <button type="button" className="ghost-button mt-7" disabled>{!isPaid && !isLoading ? 'Current plan' : 'Included'}</button> : <button type="button" className="action-button mt-7" disabled={busy || (isPaid && !managed)} onClick={() => void paidAction()}>{busy ? 'Opening…' : isPaid ? managed ? 'Manage subscription' : 'Included access' : 'Choose Better Focus Pro'}</button>}</article>)}</section>
  <p className="muted-copy px-2 text-sm">Displayed prices come from the configured checkout catalogue. Subscription cancellation and payment details are managed securely through the billing portal.</p></div>
}
