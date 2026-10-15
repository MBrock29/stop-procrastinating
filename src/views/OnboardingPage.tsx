import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { listBlockedDomains } from '../features/blocked-domains/blockedDomainsRepository'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import {
  StarterSetBuilder,
  type StarterSelection,
} from '../features/product/StarterSetBuilder'
import { chromeStoreUrl } from '../features/product/publicPlans'
import {
  completeOnboarding,
  trackProductEvent,
} from '../features/product/productExperience'
import { normalizeDomainInput } from '../utils/domains'
import { Icon } from '../ui/Icon'

const distractions = [
  ['reddit.com', 'Reddit'],
  ['youtube.com', 'YouTube'],
  ['x.com', 'X'],
  ['instagram.com', 'Instagram'],
  ['facebook.com', 'Facebook'],
  ['news.ycombinator.com', 'Hacker News'],
] as const
const steps = ['Distractions', 'Learning', 'Chrome', 'Try it']

export function OnboardingPage() {
  const { user, mode } = useAuth()
  const navigate = useNavigate()
  const extension = useExtensionStatus()
  const { addDomain } = useBlockedDomains()
  const { cards, addGeneratedCards } = useLearningCards()
  const tracked = useRef(false)
  const [step, setStep] = useState(1)
  const [sites, setSites] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [selection, setSelection] = useState<StarterSelection | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !tracked.current) {
      tracked.current = true
      void trackProductEvent(user.id, 'onboarding_started')
    }
  }, [user])

  async function saveSites() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const requested = [
        ...new Set(
          [...sites, custom].filter(Boolean).map(normalizeDomainInput),
        ),
      ]
      const existing = await listBlockedDomains(user.id)
      for (const site of requested)
        if (!existing.some((item) => item.domain === site))
          await addDomain(site)
      setStep(2)
    } catch (next) {
      setError(
        next instanceof Error ? next.message : 'Unable to save those sites.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function finish(test: boolean) {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await completeOnboarding(user.id, {
        learningCategory: selection?.category ?? 'My learning',
        learningGoal: selection?.goal ?? 'Choose my own learning material',
      })
      void trackProductEvent(user.id, 'onboarding_completed', {
        hasMaterial: cards.length > 0,
        extensionConnected: extension.status === 'connected',
      })
      navigate(test ? '/interrupt?source=onboarding&mode=quick' : '/app')
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to finish setup. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="mb-8 text-center">
        <p className="section-kicker">Make Better Focus yours</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Less autopilot. More possibility.
        </h1>
        <p className="mt-3 text-sm muted-copy">
          A few small choices. Then try your first learning pause.
        </p>
      </div>
      <ol className="flex justify-between gap-2" aria-label="Setup progress">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? 'step' : undefined}
            className="flex flex-1 flex-col items-center gap-2 text-xs"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${step >= index + 1 ? 'border-reef bg-reef text-white' : 'border-[var(--app-border)] muted-copy'}`}
            >
              {step > index + 1 ? (
                <Icon name="check" className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </span>
            <span className={step === index + 1 ? 'font-bold' : 'muted-copy'}>
              {label}
            </span>
          </li>
        ))}
      </ol>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {step === 1 ? (
        <section className="panel p-6 sm:p-8">
          <h2 className="text-2xl font-bold">
            Where does your attention wander?
          </h2>
          <p className="muted-copy mt-2 text-sm leading-6">
            Choose the sites you open without thinking. You stay in control of
            when to pause them.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {distractions.map(([domain, label]) => (
              <label
                key={domain}
                className={`soft-card flex cursor-pointer items-center gap-3 p-4 text-sm ${sites.includes(domain) ? 'ring-2 ring-reef' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={sites.includes(domain)}
                  onChange={() =>
                    setSites((current) =>
                      current.includes(domain)
                        ? current.filter((item) => item !== domain)
                        : [...current, domain],
                    )
                  }
                />
                <span className="font-semibold">{label}</span>
              </label>
            ))}
          </div>
          <label className="mt-5 block text-sm font-semibold">
            Another site?
            <input
              className="app-input mt-2"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="example.com"
            />
          </label>
          <p className="muted-copy mt-3 text-xs">
            Protected all day, every day by default. Add optional hours or
            take a break anytime in Distractions.
          </p>
          <button
            className="action-button mt-6"
            disabled={busy || (!sites.length && !custom.trim())}
            onClick={() => void saveSites()}
          >
            {busy ? 'Saving…' : 'Now, something to learn'}
            <Icon name="arrow" />
          </button>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="panel p-6 sm:p-8">
          <StarterSetBuilder
            existingCards={cards}
            onAdd={addGeneratedCards}
            onComplete={(next) => {
              setSelection(next)
              setStep(3)
            }}
          />
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[var(--app-border)] pt-5">
            <button className="text-link" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="text-link" onClick={() => setStep(3)}>
              {cards.length
                ? 'Use my existing questions'
                : 'Choose material later'}
              <Icon name="arrow" />
            </button>
          </div>
        </section>
      ) : null}
      {step === 3 ? (
        <section className="panel p-6 sm:p-8">
          <span className="feature-icon">
            <Icon name="shield" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">
            Catch the moment in Chrome.
          </h2>
          <p className="mt-3 text-sm leading-7 muted-copy">
            The extension turns a visit to a chosen site into a short learning
            pause. You can always choose to continue.
          </p>
          <div className="soft-card mt-5 p-4 text-sm">
            <strong>
              {extension.status === 'connected'
                ? 'Your extension is connected.'
                : 'Install Better Focus, then return here.'}
            </strong>
            <p className="mt-2 text-xs leading-6 muted-copy">
              {mode === 'demo'
                ? 'You can test a learning pause in this local preview. Live sync will use your connected account.'
                : 'Your saved sites and schedules sync when the extension connects.'}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {extension.status !== 'connected' ? (
              <a
                href={chromeStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="action-button"
                onClick={() =>
                  user &&
                  void trackProductEvent(user.id, 'extension_install_clicked')
                }
              >
                Add to Chrome — Free
              </a>
            ) : null}
            <button
              className="ghost-button"
              onClick={() => void extension.refresh()}
            >
              Check connection
            </button>
          </div>
          <div className="mt-7 flex justify-between border-t border-[var(--app-border)] pt-5">
            <button className="text-link" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="text-link" onClick={() => setStep(4)}>
              {extension.status === 'connected'
                ? 'Try it now'
                : 'Try it without the extension'}
              <Icon name="arrow" />
            </button>
          </div>
        </section>
      ) : null}
      {step === 4 ? (
        <section className="panel p-8 text-center">
          <span className="feature-icon mx-auto">
            <Icon name="spark" />
          </span>
          <h2 className="mt-5 text-3xl font-bold">
            One small moment. Something learned.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 muted-copy">
            {cards.length
              ? 'Try one of your questions now. This is what your next distraction will feel like.'
              : 'You can add learning material from your library whenever you are ready.'}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {cards.length ? (
              <button
                className="action-button"
                disabled={busy}
                onClick={() => void finish(true)}
              >
                Try my first pause
                <Icon name="arrow" />
              </button>
            ) : (
              <Link className="action-button" to="/app/cards">
                Choose learning material
              </Link>
            )}
            <button
              className="ghost-button"
              disabled={busy}
              onClick={() => void finish(false)}
            >
              Open my dashboard
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
