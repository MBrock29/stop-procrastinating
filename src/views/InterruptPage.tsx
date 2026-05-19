import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { listLearningCards } from '../features/cards/cardsRepository'
import { sortCardsForReview } from '../features/cards/scheduling'
import { useAuth } from '../features/auth/useAuth'
import { allowExtensionReturnOnce } from '../features/extension/extensionBridge'
import {
  completeInterruptSession,
  createInterruptSession,
  submitInterruptReview,
} from '../features/interrupts/interruptRepository'
import type { ConfidenceRating, InterruptSession, LearningCard } from '../types/domain'

export function InterruptPage() {
  const { user } = useAuth()
  const { byokCredentialStatus, settings } = useAiAccess()
  const [searchParams] = useSearchParams()
  const site = searchParams.get('site')
  const source = searchParams.get('source') ?? 'manual'
  const returnUrl = searchParams.get('returnUrl')
  const [session, setSession] = useState<InterruptSession | null>(null)
  const [cards, setCards] = useState<LearningCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const card = cards[currentIndex] ?? null
  const reviewedCount = currentIndex
  const remainingCount = Math.max(cards.length - currentIndex - 1, 0)
  const safeReturnUrl = (() => {
    if (!returnUrl) {
      return null
    }

    try {
      const parsed = new URL(returnUrl)

      if (site && parsed.hostname !== site) {
        return null
      }

      return parsed.toString()
    } catch {
      return null
    }
  })()

  function continueToOriginalSite() {
    if (!safeReturnUrl) {
      return
    }

    allowExtensionReturnOnce(safeReturnUrl)
    window.setTimeout(() => {
      window.location.href = safeReturnUrl
    }, 75)
  }

  useEffect(() => {
    let cancelled = false

    async function bootstrapInterrupt() {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError(null)
      setAnswerRevealed(false)
      setCurrentIndex(0)

      try {
        const nextSession = await createInterruptSession(user.id, site ?? source)
        const nextCards = sortCardsForReview(await listLearningCards(user.id))

        if (!cancelled) {
          setSession(nextSession)
          setCards(nextCards)
        }
      } catch (nextError) {
        if (!cancelled) {
          const message =
            nextError instanceof Error
              ? nextError.message
              : 'Unable to start the interrupt session.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrapInterrupt()

    return () => {
      cancelled = true
    }
  }, [site, source, user])

  async function handleConfidence(confidence: ConfidenceRating) {
    if (!user || !session || !card) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitInterruptReview({
        userId: user.id,
        sessionId: session.id,
        card,
        confidence,
      })

      const nextCards = cards.map((item, index) =>
        index === currentIndex ? result.updatedCard : item,
      )
      const prioritizedRemainder = sortCardsForReview(nextCards.slice(currentIndex + 1))
      const updatedCards = [...nextCards.slice(0, currentIndex + 1), ...prioritizedRemainder]
      const nextReviewedCount = currentIndex + 1

      setCards(updatedCards)
      setAnswerRevealed(false)

      if (
        safeReturnUrl &&
        settings.redirectBackMode === 'after_cards' &&
        nextReviewedCount >= settings.redirectBackCardCount
      ) {
        await completeInterruptSession(user.id, session.id)
        continueToOriginalSite()
        return
      }

      if (nextReviewedCount >= updatedCards.length) {
        await completeInterruptSession(user.id, session.id)
      } else {
        setCurrentIndex((value) => value + 1)
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to save your review.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="panel px-6 py-8 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef">
            Redirect interrupt
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">
            Pause the habit loop.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {site ? (
              <>
                You were redirected from <span className="font-semibold text-ink">{site}</span>.
              </>
            ) : (
              <>
                You started a manual learning session from{' '}
                <span className="font-semibold text-ink">{source}</span>.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app" className="ghost-button">
              Return to dashboard
            </Link>
            {safeReturnUrl && settings.showContinueToSiteButton ? (
              <button
                type="button"
                onClick={continueToOriginalSite}
                className="ghost-button"
              >
                Continue to site
              </button>
            ) : null}
            <Link to="/app/cards" className="ghost-button">
              Manage cards
            </Link>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-8 rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
              Preparing your focus interrupt…
            </div>
          ) : null}

          {!isLoading && !card && cards.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <h2 className="text-2xl font-bold text-ink">No cards to review yet</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Add your first learning card so redirects have something useful to show.
              </p>
              {settings.planTier === 'byok' && !byokCredentialStatus ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  BYOK is selected on your account, but no provider key is saved yet.
                </div>
              ) : null}
              <Link to="/app/cards" className="action-button mt-6">
                Create learning cards
              </Link>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Link to="/app/byok" className="ghost-button">
                  Check AI setup
                </Link>
                <Link to="/app/sites" className="ghost-button">
                  Check blocked sites
                </Link>
              </div>
            </div>
          ) : null}

          {!isLoading && card ? (
            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-reef">
                Learning session
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>{reviewedCount} reviewed</span>
                <span>{remainingCount} remaining</span>
                {safeReturnUrl && settings.redirectBackMode === 'after_cards' ? (
                  <span>Returns after {settings.redirectBackCardCount} card{settings.redirectBackCardCount === 1 ? '' : 's'}</span>
                ) : null}
              </div>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-ink">
                {card.question}
              </h2>

              {!answerRevealed ? (
                <button
                  type="button"
                  onClick={() => setAnswerRevealed(true)}
                  className="action-button mt-6"
                >
                  Reveal answer
                </button>
              ) : (
                <>
                  <div className="mt-6 rounded-3xl bg-white p-5 text-sm leading-7 text-slate-700">
                    {card.answer}
                  </div>
                  <div className="mt-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      How did that feel?
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleConfidence('know')}
                        className="rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        I know it
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleConfidence('semi')}
                        className="rounded-full bg-amber-500 px-5 py-3 font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Semi-confident
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleConfidence('not_confident')}
                        className="rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Not confident
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          ) : null}

          {!isLoading && !card && cards.length > 0 ? (
            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-reef">
                Session complete
              </div>
              <h2 className="mt-4 text-2xl font-bold text-ink">
                You’ve worked through every available card in this session.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Highest-priority cards will surface first the next time you start learning.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/app" className="action-button">
                  Return to dashboard
                </Link>
                {safeReturnUrl && settings.showContinueToSiteButton ? (
                  <button
                    type="button"
                    onClick={continueToOriginalSite}
                    className="ghost-button"
                  >
                    Continue to site
                  </button>
                ) : null}
                <Link to="/app/cards" className="ghost-button">
                  Manage cards
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
