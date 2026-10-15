import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { listLearningCards } from '../features/cards/cardsRepository'
import { listLearningBriefs } from '../features/briefs/briefsRepository'
import { useAuth } from '../features/auth/useAuth'
import { allowExtensionReturnOnce } from '../features/extension/extensionBridge'
import {
  completeInterruptSession,
  createInterruptSession,
  bypassInterruptSession,
  submitInterruptReview,
} from '../features/interrupts/interruptRepository'
import {
  getSafeReturnUrl,
  selectInterruptCards,
} from '../features/interrupts/interruptExperience'
import { trackProductEvent } from '../features/product/productExperience'
import type {
  ConfidenceRating,
  InterruptSession,
  InterventionMode,
  LearningBrief,
  LearningCard,
} from '../types/domain'
import { BrandMark, Icon } from '../ui/Icon'

export function InterruptPage() {
  const { user } = useAuth()
  const { settings } = useAiAccess()
  const [params] = useSearchParams()
  const site = params.get('site')
  const topic = params.get('topic')
  const rawSource = params.get('source')
  const source =
    rawSource === 'extension'
      ? 'extension'
      : rawSource === 'onboarding'
        ? 'onboarding'
        : 'practice'
  const requestedMode = params.get('mode')
  const mode: InterventionMode = [
    'quick',
    'focus',
    'intentional',
    'soft',
    'hard',
    'smart',
  ].includes(requestedMode ?? '')
    ? (requestedMode as InterventionMode)
    : 'quick'
  const safeReturnUrl = getSafeReturnUrl(params.get('returnUrl'), site)
  const [session, setSession] = useState<InterruptSession | null>(null)
  const [cards, setCards] = useState<LearningCard[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [intent, setIntent] = useState('')
  const [intentConfirmed, setIntentConfirmed] = useState(false)
  const [brief, setBrief] = useState<LearningBrief | null>(null)
  const bootstrap = useRef<{
    key: string
    promise: Promise<{ cards: LearningCard[]; session: InterruptSession }>
  } | null>(null)
  const card = cards[index]
  const finished = cards.length > 0 && index >= cards.length

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setIndex(0)
    setRevealed(false)
    setComplete(false)
    setIntentConfirmed(false)
    const key = `${user.id}:${site}:${source}:${mode}:${topic}`
    if (bootstrap.current?.key !== key) {
      bootstrap.current = {
        key,
        promise: (async () => {
          const nextCards = selectInterruptCards(
            await listLearningCards(user.id),
            mode,
            topic,
            source,
          )
          const nextSession = await createInterruptSession(
            user.id,
            site ?? 'practice',
            mode,
            source,
          )
          void trackProductEvent(
            user.id,
            source === 'onboarding'
              ? 'test_interruption_started'
              : 'interruption_started',
            { source, mode },
          )
          return { cards: nextCards, session: nextSession }
        })(),
      }
    }
    void bootstrap.current.promise
      .then((result) => {
        if (!cancelled) {
          setSession(result.session)
          setCards(result.cards)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'We could not load your question. You can continue to your site or try again later.',
          )
          bootstrap.current = null
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, site, source, topic, user])

  useEffect(() => {
    let cancelled = false
    if (
      !user ||
      settings.planTier !== 'premium' ||
      settings.premiumInterruptMode !== 'summary'
    )
      return
    void listLearningBriefs(user.id)
      .then((briefs) => {
        if (!cancelled)
          setBrief(
            briefs.find(
              (item) =>
                !topic || item.topic.toLowerCase() === topic.toLowerCase(),
            ) ?? null,
          )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [settings.planTier, settings.premiumInterruptMode, topic, user])

  function navigateToSite() {
    if (!safeReturnUrl) return
    allowExtensionReturnOnce(safeReturnUrl)
    window.setTimeout(() => {
      window.location.href = safeReturnUrl
    }, 75)
  }

  async function leave() {
    if (busy || !safeReturnUrl) return
    setBusy(true)
    try {
      if (user && session && !complete) {
        await bypassInterruptSession(user.id, session.id)
        void trackProductEvent(user.id, 'interruption_bypassed', {
          source,
          mode,
        })
      }
    } catch {
      /* Returning to the user's site must not depend on telemetry availability. */
    }
    navigateToSite()
    setBusy(false)
  }

  async function finishSession(reviewed: number) {
    if (!user || !session) return
    await completeInterruptSession(user.id, session.id)
    setComplete(true)
    void trackProductEvent(user.id, 'interruption_completed', {
      source,
      mode,
      reviewed,
    })
    if (
      safeReturnUrl &&
      settings.redirectBackMode === 'after_cards' &&
      reviewed >= Math.min(cards.length, settings.redirectBackCardCount)
    )
      navigateToSite()
  }

  async function rate(confidence: ConfidenceRating) {
    if (!user || !session || !card || busy) return
    setBusy(true)
    setError(null)
    try {
      await submitInterruptReview({
        userId: user.id,
        sessionId: session.id,
        card,
        confidence,
      })
      const nextIndex = index + 1
      setIndex(nextIndex)
      setRevealed(false)
      if (nextIndex >= cards.length) await finishSession(nextIndex)
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to save your review. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const hardBlocked = mode === 'hard' && index === 0 && Boolean(card) && !error

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 sm:py-12">
      <header>
        <Link
          to="/app"
          className="mx-auto flex w-fit items-center gap-3 text-sm font-extrabold"
        >
          <BrandMark />
          Better Focus
        </Link>
      </header>
      <main className="my-auto py-12">
        <div className="mb-7 text-center">
          <p className="section-kicker">
            {source === 'extension'
              ? 'A small pause. A better choice.'
              : source === 'onboarding'
                ? 'Your first useful pause'
                : 'A moment for your mind'}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {finished
              ? 'That is a moment well spent.'
              : 'Quick one before you go.'}
          </h1>
          <p className="mt-3 text-sm muted-copy">
            {site && source === 'extension' ? (
              <>
                You were on your way to <strong>{site}</strong>. Take a little
                knowledge with you.
              </>
            ) : (
              'One useful question. Then get on with your day.'
            )}
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </p>
        ) : null}
        {loading ? (
          <div
            role="status"
            className="panel p-10 text-center text-sm muted-copy"
          >
            Finding your next question…
          </div>
        ) : finished ? (
          <section className="panel p-8 text-center">
            <span className="feature-icon mx-auto">
              <Icon name="check" />
            </span>
            <h2 className="mt-5 text-2xl font-bold">
              {index} question{index === 1 ? '' : 's'}. A little progress.
            </h2>
            <p className="mt-3 text-sm leading-7 muted-copy">
              Your next review is scheduled from how that felt. Difficult
              questions come back sooner; familiar ones get more space.
            </p>
            {!complete ? (
              <button
                disabled={busy}
                className="ghost-button mt-4"
                onClick={() => {
                  setBusy(true)
                  void finishSession(index)
                    .catch(() =>
                      setError(
                        'Unable to finish saving. Your answers are already recorded.',
                      ),
                    )
                    .finally(() => setBusy(false))
                }}
              >
                Finish saving session
              </button>
            ) : null}
            <Link className="action-button mt-6" to="/app">
              Back to my day
              <Icon name="arrow" />
            </Link>
          </section>
        ) : !card ? (
          <section className="panel p-8 text-center">
            <span className="feature-icon mx-auto">
              <Icon name="book" />
            </span>
            <h2 className="mt-5 text-xl font-bold">
              {source === 'extension'
                ? 'Nothing due right now.'
                : 'Give your next pause something to work with.'}
            </h2>
            <p className="mt-3 text-sm muted-copy">
              {source === 'extension'
                ? 'You can carry on, or add a new learning set for next time.'
                : 'Choose a topic you care about and add a few questions.'}
            </p>
            <Link to="/app/cards" className="action-button mt-6">
              Open my learning
              <Icon name="arrow" />
            </Link>
          </section>
        ) : mode === 'intentional' && !intentConfirmed ? (
          <section className="panel p-7">
            <p className="section-kicker">A moment of intention</p>
            <h2 className="mt-4 text-2xl font-bold">What are you here for?</h2>
            <label className="mt-5 block text-sm font-semibold">
              Your reason
              <input
                autoFocus
                className="app-input mt-2"
                maxLength={200}
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                placeholder="I want to check one specific thing…"
              />
            </label>
            <p className="mt-2 text-xs muted-copy">
              This stays on this screen. It is not saved.
            </p>
            <button
              className="action-button mt-5"
              disabled={!intent.trim()}
              onClick={() => setIntentConfirmed(true)}
            >
              Take one question first
              <Icon name="arrow" />
            </button>
          </section>
        ) : (
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] px-6 py-4 text-xs muted-copy">
              <span className="truncate pr-3">
                {card.generationTopic ?? 'Your learning'}
              </span>
              <span className="shrink-0">
                {index + 1} of {cards.length} · about 30 sec
              </span>
            </div>
            <div className="p-7 sm:p-9">
              <h2 className="text-2xl font-bold leading-relaxed">
                {card.question}
              </h2>
              {revealed ? (
                <>
                  <div className="soft-card mt-6 p-5 text-sm leading-7">
                    {card.answer}
                  </div>
                  {card.citationExcerpts?.length ? (
                    <details className="mt-4 text-xs muted-copy">
                      <summary>From your source material</summary>
                      {card.citationExcerpts.map((excerpt, i) => (
                        <p key={i} className="mt-3 leading-6">
                          {excerpt}
                        </p>
                      ))}
                    </details>
                  ) : null}
                  <p className="mt-7 text-center text-xs muted-copy">
                    How well did you remember?
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      disabled={busy}
                      onClick={() => void rate('not_confident')}
                      className="ghost-button px-2"
                    >
                      Need practice
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void rate('semi')}
                      className="ghost-button px-2"
                    >
                      Almost there
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void rate('know')}
                      className="action-button px-2"
                    >
                      Got it
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm muted-copy">
                    Try answering in your head before you look.
                  </p>
                  <button
                    disabled={busy}
                    className="action-button mt-7 w-full"
                    onClick={() => setRevealed(true)}
                  >
                    Show answer
                    <Icon name="arrow" />
                  </button>
                </>
              )}
              {brief ? (
                <details className="mt-5 border-t border-[var(--app-border)] pt-4 text-sm">
                  <summary className="font-semibold text-reef">
                    Read my topic summary
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap leading-7 muted-copy">
                    {brief.content}
                  </p>
                </details>
              ) : null}
            </div>
          </section>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {safeReturnUrl ? (
            <button
              disabled={busy || hardBlocked}
              onClick={() => void leave()}
              className="text-sm font-medium muted-copy hover:text-reef"
            >
              {complete ? `Continue to ${site}` : 'Continue anyway'}
            </button>
          ) : null}
          <Link to="/app" className="text-link">
            {finished ? 'View my progress' : 'Go back to my day'}
            <Icon name="arrow" />
          </Link>
        </div>
        {hardBlocked ? (
          <p className="mt-3 text-center text-xs muted-copy">
            You chose answer-first mode. Review one question to continue, or go
            back to your day.
          </p>
        ) : null}
      </main>
      <footer className="text-center text-xs muted-copy">
        Progress, without the pressure.
      </footer>
    </div>
  )
}
