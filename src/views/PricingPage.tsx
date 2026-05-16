import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { SUPPORTED_AI_MODELS, SUPPORTED_AI_PROVIDERS, TIER_POLICIES } from '../features/ai-access/constants'
import type { AiProvider, PlanTier, SupportedAiModel } from '../types/domain'

interface ByokDraft {
  provider: AiProvider
  model: SupportedAiModel
  apiKey: string
}

export function PricingPage() {
  const {
    clearByokCredentials,
    error,
    events,
    isLoading,
    localByokCredentials,
    settings,
    setPlanTier,
    saveByokCredentials,
    updateSettings,
    usage,
  } = useAiAccess()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [byokDraft, setByokDraft] = useState<ByokDraft>({
    provider: settings.byokProvider,
    model: settings.preferredModel,
    apiKey: '',
  })

  useEffect(() => {
    setByokDraft((current) => ({
      provider: settings.byokProvider,
      model: settings.preferredModel,
      apiKey: current.apiKey,
    }))
  }, [settings.byokProvider, settings.preferredModel])

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

    const nextApiKey = byokDraft.apiKey.trim() || localByokCredentials?.apiKey

    if (!nextApiKey) {
      setFormError('Add your API key before switching to BYOK mode.')
      setPending(false)
      return
    }

    try {
      saveByokCredentials({
        provider: byokDraft.provider,
        apiKey: nextApiKey,
      })
      await updateSettings({
        planTier: 'byok',
        byokProvider: byokDraft.provider,
        preferredModel: byokDraft.model,
      })
      setByokDraft((current) => ({ ...current, apiKey: '' }))
      setSuccessMessage('BYOK mode is active on this device.')
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to save your BYOK settings.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  const lastFour = localByokCredentials?.apiKey
    ? localByokCredentials.apiKey.slice(-4)
    : null

  const planCards: Array<{
    tier: PlanTier
    title: string
    subtitle: string
    model: string
    limits: string
    cta: string
    disabled?: boolean
  }> = [
    {
      tier: 'free',
      title: 'Free',
      subtitle: 'A small monthly allowance using your hosted key.',
      model: 'gpt-4o-mini',
      limits: 'Up to 10 cards per pack, 3 packs per month',
      cta: settings.planTier === 'free' ? 'Current plan' : 'Use free plan',
    },
    {
      tier: 'pro',
      title: 'Pro',
      subtitle: 'Larger hosted batches on the stronger model.',
      model: 'gpt-5.4-mini',
      limits: 'Up to 500 cards per pack, 100 packs per month',
      cta: settings.planTier === 'pro' ? 'Current plan' : 'Billing coming soon',
      disabled: settings.planTier !== 'pro',
    },
    {
      tier: 'byok',
      title: 'BYOK',
      subtitle: 'Bring your own provider key and choose your model.',
      model: settings.preferredModel,
      limits: 'Up to 500 cards per pack, unlimited packs per month',
      cta: settings.planTier === 'byok' ? 'Current plan' : 'Configure BYOK below',
      disabled: true,
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
          Pricing
        </p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
          Choose how AI generation is paid for
        </h2>
        <p className="mt-4 max-w-2xl text-slate-600">
          Free and Pro use the platform key with monthly limits. BYOK keeps the spend on
          your own provider key and unlocks unlimited pack generation while still keeping
          the same card flow.
        </p>

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {planCards.map((card) => (
            <article key={card.tier} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {card.title}
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
                {card.model}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.subtitle}</p>
              <div className="mt-4 text-sm font-semibold text-slate-700">{card.limits}</div>
              {card.tier === 'free' ? (
                <button
                  type="button"
                  className="action-button mt-6 w-full"
                  onClick={() => void handleSwitchToFree()}
                  disabled={pending || settings.planTier === 'free'}
                >
                  {card.cta}
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button mt-6 w-full"
                  disabled={card.disabled}
                >
                  {card.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        <form
          className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5"
          onSubmit={handleByokSubmit}
        >
          <h3 className="text-xl font-extrabold tracking-tight text-ink">BYOK settings</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your key is stored on this device only and is sent with generation requests so
            the usage lands on your provider account instead of the platform key.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Provider</span>
              <select
                value={byokDraft.provider}
                onChange={(event) =>
                  setByokDraft((current) => ({
                    ...current,
                    provider: event.target.value as AiProvider,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
              >
                {SUPPORTED_AI_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Model</span>
              <select
                value={byokDraft.model}
                onChange={(event) =>
                  setByokDraft((current) => ({
                    ...current,
                    model: event.target.value as SupportedAiModel,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
              >
                {SUPPORTED_AI_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">API key</span>
            <input
              value={byokDraft.apiKey}
              onChange={(event) =>
                setByokDraft((current) => ({
                  ...current,
                  apiKey: event.target.value,
                }))
              }
              type="password"
              placeholder={
                lastFour ? `Saved on this device (ends with ${lastFour})` : 'Paste your provider key'
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
            />
          </label>

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
              onClick={() => clearByokCredentials()}
              disabled={!localByokCredentials}
            >
              Clear saved key
            </button>
          </div>
        </form>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h3 className="text-2xl font-extrabold tracking-tight text-ink">Usage this month</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Current plan
            </div>
            <div className="mt-3 text-2xl font-extrabold text-ink">
              {TIER_POLICIES[settings.planTier].label}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Packs used
            </div>
            <div className="mt-3 text-2xl font-extrabold text-ink">
              {usage.currentMonthPacksUsed}
              {TIER_POLICIES[settings.planTier].monthlyPackLimit != null
                ? ` / ${TIER_POLICIES[settings.planTier].monthlyPackLimit}`
                : ''}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cards generated
            </div>
            <div className="mt-3 text-2xl font-extrabold text-ink">
              {usage.currentMonthCardsGenerated}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Platform spend
            </div>
            <div className="mt-3 text-2xl font-extrabold text-ink">
              ${usage.currentMonthPlatformCostUsd.toFixed(4)}
            </div>
            {usage.currentMonthByokCostUsd > 0 ? (
              <div className="mt-2 text-sm text-slate-500">
                BYOK usage estimate: ${usage.currentMonthByokCostUsd.toFixed(4)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
          {usage.lastGeneratedAt
            ? `Last generation ran on ${new Date(usage.lastGeneratedAt).toLocaleString()}.`
            : 'No packs generated yet this month.'}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-lg font-bold text-ink">Recent requests</h4>
            <Link to="/app/cards" className="text-sm font-semibold text-reef">
              Go to cards
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
              No AI generation activity yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {events.slice(0, 8).map((event) => (
                <article key={event.id} className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {event.planTier} · {event.model}
                      </div>
                      <div className="mt-1 text-base font-bold text-ink">{event.topic}</div>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <div>{event.cardCount} cards</div>
                      <div>{new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {event.status === 'success'
                      ? `Success${event.estimatedCostUsd != null ? ` · est. $${event.estimatedCostUsd.toFixed(4)}` : ''}`
                      : event.failureReason ?? event.status}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
