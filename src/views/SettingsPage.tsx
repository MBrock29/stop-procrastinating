import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'

export function SettingsPage() {
  const navigate = useNavigate()
  const { mode, session, signOut, user } = useAuth()
  const { byokCredentialStatus, clearByokCredentials, settings } = useAiAccess()
  const { domains } = useBlockedDomains()
  const { cards } = useLearningCards()
  const extensionStatus = useExtensionStatus()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeDomains = domains.filter((item) => item.isActive).length
  const activeCards = cards.filter((item) => !item.isArchived).length
  const authProvider =
    session?.user.app_metadata.provider ??
    (mode === 'demo' ? 'demo' : 'email')

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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="section-kicker">Settings</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
          Keep your account and setup in good shape.
        </h2>
        <p className="muted-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">
          Review your sign-in details, extension connection, and BYOK security from one place.
        </p>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
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
              {settings.planTier === 'byok'
                ? 'Bring your own key'
                : settings.planTier === 'pro'
                  ? 'Pro'
                  : 'Free'}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Preferred model: {settings.preferredModel}
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
          <h3 className="text-lg font-bold text-ink dark:text-white">Security and privacy</h3>
          <ul className="muted-copy mt-4 space-y-3 text-sm leading-6">
            <li>Your BYOK key is stored against your account in encrypted form and is only used inside Supabase Edge Functions.</li>
            <li>The app never shows the full saved key back to the browser after it is stored.</li>
            <li>The browser extension stores synced blocked domains locally in Chrome so redirects can happen quickly.</li>
            <li>Using BYOK moves LLM request costs to your own provider account, but your product data still lives in Supabase.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/pricing" className="ghost-button">
            Manage plans
          </Link>
          <Link to="/app/setup" className="ghost-button">
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
        </div>

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
                : 'If you want cross-device BYOK, add your provider key on the pricing page.'}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/app/pricing" className="ghost-button">
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

        <div className="panel px-6 py-6 sm:px-8">
          <h3 className="text-lg font-bold text-ink dark:text-white">Account actions</h3>
          <p className="muted-copy mt-3 text-sm leading-6">
            Sign out here if you are on a shared device or want to reconnect your session cleanly.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="ghost-button"
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
