import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getNextLearningCard } from '../features/cards/cardsRepository'
import { useAuth } from '../features/auth/useAuth'
import { createInterruptSession, submitInterruptReview } from '../features/interrupts/interruptRepository'
import type { ConfidenceRating, InterruptSession, LearningCard } from '../types/domain'

export function InterruptPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const site = searchParams.get('site') ?? 'unknown-site.com'
  const source = searchParams.get('source') ?? 'manual'
  const [session, setSession] = useState<InterruptSession | null>(null)
  const [card, setCard] = useState<LearningCard | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrapInterrupt() {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError(null)
      setAnswerRevealed(false)
      setCompletionMessage(null)

      try {
        const nextSession = await createInterruptSession(user.id, site)
        const nextCard = await getNextLearningCard(user.id)

        if (!cancelled) {
          setSession(nextSession)
          setCard(nextCard)
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
  }, [site, user])

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

      setCard(result.updatedCard)
      setCompletionMessage(
        confidence === 'know'
          ? 'Nice. This card has been pushed farther out.'
          : confidence === 'semi'
            ? 'Solid. This card will come back at a medium interval.'
            : 'Useful signal. This card will return sooner for reinforcement.',
      )
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to save your review.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="panel px-6 py-8 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
            Redirect interrupt
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">
            Pause the habit loop.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The extension tried to open <span className="font-semibold text-ink">{site}</span>.
            {' '}You were redirected from <span className="font-semibold text-ink">{source}</span>.
          </p>

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

          {!isLoading && !card ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <h2 className="text-2xl font-bold text-ink">No cards to review yet</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Add your first learning card so redirects have something useful to show.
              </p>
              <Link to="/app/cards" className="action-button mt-6">
                Create learning cards
              </Link>
            </div>
          ) : null}

          {!isLoading && card ? (
            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
                One-card review
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
                        disabled={isSubmitting || Boolean(completionMessage)}
                        onClick={() => void handleConfidence('know')}
                        className="rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        I know it
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || Boolean(completionMessage)}
                        onClick={() => void handleConfidence('semi')}
                        className="rounded-full bg-amber-500 px-5 py-3 font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Semi-confident
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || Boolean(completionMessage)}
                        onClick={() => void handleConfidence('not_confident')}
                        className="rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Not confident
                      </button>
                    </div>
                  </div>
                </>
              )}

              {completionMessage ? (
                <div className="mt-6 rounded-3xl bg-white p-5">
                  <div className="text-lg font-bold text-ink">Review captured</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{completionMessage}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Next review: {card.nextReviewAt ? new Date(card.nextReviewAt).toLocaleString() : 'Not scheduled'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/app" className="action-button">
                      Return to dashboard
                    </Link>
                    <Link to="/app/cards" className="ghost-button">
                      Manage cards
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
