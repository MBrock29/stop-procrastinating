import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { SUPPORTED_AI_MODELS, SUPPORTED_AI_PROVIDERS, TIER_POLICIES } from '../features/ai-access/constants'
import type { AiProvider, PlanTier, SupportedAiModel } from '../types/domain'

interface ByokDraft {
  provider: AiProvider
  apiKey: string
}

type BillingCadence = 'monthly' | 'yearly'

interface PlanCardDefinition {
  tier: PlanTier
  title: string
  eyebrow: string
  price: string
  cadenceLabel: string
  priceClassName?: string
  summary: string
  benefits: string[]
  ctaLabel: string
  ctaKind: 'free' | 'coming-soon' | 'scroll'
  badge?: string
}

function looksLikeApiKey(provider: AiProvider, apiKey: string) {
  const trimmed = apiKey.trim()

  if (!trimmed) {
    return false
  }

  if (provider === 'openai') {
    return trimmed.startsWith('sk-')
  }

  return trimmed.startsWith('sk-or-') || trimmed.startsWith('sk_') || trimmed.startsWith('sk-')
}

export function PricingPage() {
  const {
    byokCredentialStatus,
    clearByokCredentials,
    error,
    events,
    isLoading,
    settings,
    setPlanTier,
    saveByokCredentials,
    updateSettings,
    usage,
  } = useAiAccess()
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('monthly')
  const [pending, setPending] = useState(false)
  const [preferencePending, setPreferencePending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [byokDraft, setByokDraft] = useState<ByokDraft>({
    provider: settings.byokProvider,
    apiKey: '',
  })

  useEffect(() => {
    setByokDraft((current) => ({
      provider: settings.byokProvider,
      apiKey: current.apiKey,
    }))
  }, [settings.byokProvider])

  const planCards = useMemo<PlanCardDefinition[]>(() => {
    const proPrice = billingCadence === 'monthly' ? '£1.99' : '£19.99'
    const proCadenceLabel = billingCadence === 'monthly' ? '/month' : '/year'

    return [
      {
        tier: 'free',
        title: 'Free',
        eyebrow: 'Get started',
        price: '£0',
        cadenceLabel: '/month',
        summary: 'A light plan for occasional topic packs.',
        benefits: [
          'Store up to 100 cards',
          'Generate up to 3 packs per month',
          'Generate up to 10 cards per pack',
          'Access to the lighter hosted language learning model',
        ],
        ctaLabel: settings.planTier === 'free' ? 'Current plan' : 'Use free plan',
        ctaKind: 'free',
      },
      {
        tier: 'pro',
        title: 'Pro',
        eyebrow: 'For heavy learners',
        price: proPrice,
        cadenceLabel: proCadenceLabel,
        summary: 'Higher-volume generation and the stronger hosted model.',
        benefits: [
          'Store up to 500 cards',
          'Generate up to 100 packs per month',
          'Generate up to 500 cards per pack',
          'Access to the stronger hosted language learning model',
        ],
        ctaLabel: 'Billing coming soon',
        ctaKind: 'coming-soon',
        badge: billingCadence === 'yearly' ? '12 months for the price of 10' : undefined,
      },
      {
        tier: 'byok',
        title: 'Bring your own key',
        eyebrow: 'Bring your own key',
        price: 'Billed',
        cadenceLabel: 'by your provider',
        priceClassName: 'text-3xl sm:text-[2rem]',
        summary: 'Keep generation costs on your own provider account.',
        benefits: [
          'Store up to 500 cards',
          'Generate unlimited packs per month',
          'Generate up to 500 cards per pack',
          'Choose either gpt-4.1-mini or gpt-5.4-mini',
        ],
        ctaLabel: settings.planTier === 'byok' ? 'Current plan' : 'Configure below',
        ctaKind: 'scroll',
      },
    ]
  }, [billingCadence, settings.planTier])

  async function handleSwitchToFree() {
    setPending(true)
    setFormError(null)
    setSuccessMessage(null)

    try {
      await setPlanTier('free')
      setSuccessMessage('Free plan is now active.')
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to switch plans right now.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  async function handleByokSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFormError(null)
    setSuccessMessage(null)

    const trimmedDraftKey = byokDraft.apiKey.trim()
    const canReuseSavedKey =
      Boolean(byokCredentialStatus) && byokCredentialStatus?.provider === byokDraft.provider
    if (!trimmedDraftKey && !canReuseSavedKey) {
      setFormError(
        'Add a provider key for the selected provider before switching to BYOK mode.',
      )
      setPending(false)
      return
    }

    if (trimmedDraftKey && !looksLikeApiKey(byokDraft.provider, trimmedDraftKey)) {
      setFormError(`That does not look like a valid ${byokDraft.provider} API key.`)
      setPending(false)
      return
    }

    try {
      if (trimmedDraftKey) {
        await saveByokCredentials({
          provider: byokDraft.provider,
          apiKey: trimmedDraftKey,
        })
      }
      await updateSettings({
        planTier: 'byok',
        byokProvider: byokDraft.provider,
        preferredModel: settings.preferredModel,
      })
      setByokDraft((current) => ({ ...current, apiKey: '' }))
      setSuccessMessage('BYOK mode is active on your account.')
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to save your BYOK settings.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  async function handleClearByok() {
    setPending(true)
    setFormError(null)
    setSuccessMessage(null)

    try {
      await clearByokCredentials()

      if (settings.planTier === 'byok') {
        await setPlanTier('free')
        setSuccessMessage('Saved BYOK key cleared. Switched back to the free plan.')
      } else {
        setSuccessMessage('Saved BYOK key cleared from your account.')
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to clear your BYOK settings.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  async function handleByokModelChange(nextModel: SupportedAiModel) {
    if (nextModel === settings.preferredModel) {
      return
    }

    setPreferencePending(true)
    setFormError(null)
    setSuccessMessage(null)

    try {
      await updateSettings({
        planTier: settings.planTier,
        byokProvider: settings.byokProvider,
        preferredModel: nextModel,
      })
      setSuccessMessage(`BYOK model updated to ${nextModel}.`)
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to update your BYOK model.'
      setFormError(message)
    } finally {
      setPreferencePending(false)
    }
  }

  const lastFour = byokCredentialStatus?.lastFour ?? null

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Pricing</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
              Keep the plan simple and the limits clear.
            </h2>
            <p className="muted-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">
              Hosted plans use the platform key with strict limits. BYOK keeps the
              generation spend on your own account while preserving the same review flow.
            </p>
          </div>

          <div className="soft-card inline-flex p-1">
            {(['monthly', 'yearly'] as BillingCadence[]).map((cadence) => (
              <button
                key={cadence}
                type="button"
                onClick={() => setBillingCadence(cadence)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  billingCadence === cadence
                    ? 'bg-reef text-white shadow-lg shadow-reef/20'
                    : 'text-[var(--app-text)] hover:bg-[var(--app-surface-strong)]',
                ].join(' ')}
              >
                {cadence === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {planCards.map((plan) => {
            const isCurrent = settings.planTier === plan.tier

            return (
              <article
                key={plan.tier}
                className={[
                  'relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6',
                  plan.tier === 'pro'
                    ? 'border-amber-300/50 bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-amber-950/30 dark:via-slate-950 dark:to-cyan-950/20'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-muted)]',
                ].join(' ')}
              >
                {plan.badge ? (
                  <div className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-900">
                    {plan.badge}
                  </div>
                ) : null}

                <div className="text-xs font-bold uppercase tracking-[0.28em] text-reef">
                  {plan.eyebrow}
                </div>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                  {plan.title}
                </h3>
                <div className="mt-4 flex items-end gap-2">
                  <span
                    className={[
                      'font-extrabold tracking-tight text-ink dark:text-white',
                      plan.priceClassName ?? 'text-4xl',
                    ].join(' ')}
                  >
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                    {plan.cadenceLabel}
                  </span>
                </div>
                <p className="muted-copy mt-4 text-sm leading-6">{plan.summary}</p>

                <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-reef/12 text-xs font-bold text-reef">
                        ✓
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  {plan.ctaKind === 'free' ? (
                    <button
                      type="button"
                      className="action-button w-full"
                      onClick={() => void handleSwitchToFree()}
                      disabled={pending || isCurrent}
                    >
                      {plan.ctaLabel}
                    </button>
                  ) : plan.ctaKind === 'scroll' ? (
                    <a href="#byok-settings" className="ghost-button w-full">
                      {plan.ctaLabel}
                    </a>
                  ) : (
                    <button type="button" className="ghost-button w-full" disabled>
                      {isCurrent ? 'Current plan' : plan.ctaLabel}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <form
          id="byok-settings"
          className="mt-8 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-6"
          onSubmit={handleByokSubmit}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">BYOK</p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                Bring your own provider key
              </h3>
              <p className="muted-copy mt-2 max-w-2xl text-sm leading-6">
                Your key is stored against your account in encrypted form. When BYOK is active,
                generation requests use that key so the cost lands on your provider account instead
                of the platform.
              </p>
              <p className="muted-copy mt-2 max-w-2xl text-sm leading-6">
                Once saved, the same BYOK setup can work across your devices when you sign in to the same account.
              </p>
            </div>
            <div className="soft-card px-4 py-3 text-sm">
              <div className="font-semibold text-ink dark:text-white">Saved on your account</div>
              <div className="muted-copy mt-1">
                {lastFour ? `Key ending ${lastFour}` : 'No BYOK key saved yet'}
              </div>
              <div className="muted-copy mt-1">
                {byokCredentialStatus ? `Provider: ${byokCredentialStatus.provider}` : 'No BYOK key stored yet'}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Provider
              </span>
              <select
                value={byokDraft.provider}
                onChange={(event) =>
                  setByokDraft((current) => ({
                    ...current,
                    provider: event.target.value as AiProvider,
                  }))
                }
                className="app-select"
              >
                {SUPPORTED_AI_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm">
            <div className="font-semibold text-ink dark:text-white">Model preference</div>
            <p className="muted-copy mt-2 leading-6">
              Change the model here without replacing your saved provider key. The new preference is saved automatically.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  BYOK model
                </span>
                <select
                  value={settings.preferredModel}
                  onChange={(event) =>
                    void handleByokModelChange(event.target.value as SupportedAiModel)
                  }
                  className="app-select"
                  disabled={preferencePending || isLoading}
                >
                  {SUPPORTED_AI_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-sm text-slate-500 dark:text-slate-300">
                {preferencePending ? 'Saving preference…' : 'Saved to your account'}
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              API key
            </span>
            <input
              value={byokDraft.apiKey}
              onChange={(event) =>
                setByokDraft((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              type="password"
              placeholder={lastFour ? `Saved on your account (ends with ${lastFour})` : 'Paste your provider key'}
              className="app-input"
            />
          </label>

          <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm muted-copy">
            {settings.planTier === 'byok'
              ? `BYOK is active on this account. New packs will use your ${settings.byokProvider} key with ${settings.preferredModel}.`
              : 'BYOK is not active yet. Save a provider key, then switch this account over to your own provider usage.'}
          </div>

          {formError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {formError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" className="action-button" disabled={pending || isLoading}>
              {pending ? 'Saving…' : 'Save key and switch to BYOK'}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleClearByok()}
              disabled={!byokCredentialStatus || pending}
            >
              Clear saved key
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="panel px-6 py-6 sm:px-8">
          <p className="section-kicker">Usage</p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
            Track monthly generation at a glance
          </h3>
          <p className="muted-copy mt-3 text-sm leading-6">
            See how close a hosted plan is to its limit and how much generation cost is
            landing on the platform versus your own BYOK setup.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="metric-card">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Current plan
              </div>
              <div className="mt-3 text-2xl font-extrabold text-ink dark:text-white">
                {TIER_POLICIES[settings.planTier].label}
              </div>
            </div>
            <div className="metric-card">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Packs used
              </div>
              <div className="mt-3 text-2xl font-extrabold text-ink dark:text-white">
                {usage.currentMonthPacksUsed}
                {TIER_POLICIES[settings.planTier].monthlyPackLimit != null
                  ? ` / ${TIER_POLICIES[settings.planTier].monthlyPackLimit}`
                  : ''}
              </div>
            </div>
            <div className="metric-card">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Cards generated
              </div>
              <div className="mt-3 text-2xl font-extrabold text-ink dark:text-white">
                {usage.currentMonthCardsGenerated}
              </div>
            </div>
            <div className="metric-card">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Platform spend
              </div>
              <div className="mt-3 text-2xl font-extrabold text-ink dark:text-white">
                £{usage.currentMonthPlatformCostUsd.toFixed(2)}
              </div>
              {usage.currentMonthByokCostUsd > 0 ? (
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  BYOK estimate: £{usage.currentMonthByokCostUsd.toFixed(2)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="soft-card mt-6 px-5 py-4 text-sm">
            <div className="font-semibold text-ink dark:text-white">
              {usage.lastGeneratedAt ? 'Last request' : 'No requests yet'}
            </div>
            <div className="muted-copy mt-1">
              {usage.lastGeneratedAt
                ? new Date(usage.lastGeneratedAt).toLocaleString()
                : 'Generate your first pack to start seeing usage here.'}
            </div>
          </div>
        </section>

        <section className="panel px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">History</p>
              <h4 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
                Recent requests
              </h4>
            </div>
            <Link to="/app/cards" className="text-sm font-semibold text-reef">
              Go to cards
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="soft-card mt-6 px-5 py-8 text-sm muted-copy">
              No AI generation activity yet.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {events.slice(0, 8).map((event) => (
                <article
                  key={event.id}
                  className="rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-reef">
                        {event.planTier} · {event.model}
                      </div>
                      <div className="mt-1 text-base font-bold text-ink dark:text-white">{event.topic}</div>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-300">
                      <div>{event.cardCount} cards</div>
                      <div>{new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="muted-copy mt-3 text-sm">
                    {event.status === 'success'
                      ? `Success${event.estimatedCostUsd != null ? ` · est. £${event.estimatedCostUsd.toFixed(2)}` : ''}`
                      : event.failureReason ?? event.status}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
