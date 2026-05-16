import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { SUPPORTED_AI_MODELS, SUPPORTED_AI_PROVIDERS, TIER_POLICIES } from '../features/ai-access/constants'
import type { AiProvider, SupportedAiModel } from '../types/domain'

interface ByokDraft {
  provider: AiProvider
  apiKey: string
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

export function ByokPage() {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">BYOK</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
              Bring your own provider key
            </h2>
            <p className="muted-copy mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              Store your provider key on your account, choose your model, and keep generation costs on your own provider instead of the platform.
            </p>
          </div>
          <Link to="/app/pricing" className="ghost-button">
            Back to pricing
          </Link>
        </div>

        <form
          id="byok-settings"
          className="mt-8 rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-6"
          onSubmit={handleByokSubmit}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                Save and manage your key
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
                {byokCredentialStatus
                  ? `Provider: ${byokCredentialStatus.provider}`
                  : 'No BYOK key stored yet'}
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
            <div className="mt-4">
              <label className="inline-block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  BYOK model
                </span>
                <select
                  value={settings.preferredModel}
                  onChange={(event) =>
                    void handleByokModelChange(event.target.value as SupportedAiModel)
                  }
                  className="app-select min-w-[14rem] w-auto pr-10"
                  disabled={preferencePending || isLoading}
                >
                  {SUPPORTED_AI_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
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
              placeholder={
                lastFour
                  ? `Saved on your account (ends with ${lastFour})`
                  : 'Paste your provider key'
              }
              className="app-input"
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
                      <div className="mt-1 text-base font-bold text-ink dark:text-white">
                        {event.topic}
                      </div>
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
