import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import {
  generateTutorSession,
  listTutorRuns,
} from '../features/tutor/tutorRepository'
import type { TutorResult } from '../types/domain'
import { topicPracticeUrl } from '../features/product/learningTopics'
import { Icon } from '../ui/Icon'

export function TutorPage() {
  const { user, mode } = useAuth()
  const { settings } = useAiAccess()
  const [result, setResult] = useState<TutorResult | null>(null)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canGenerate = mode === 'demo' || settings.planTier === 'premium'

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setIsHistoryLoading(false)
      return
    }
    void listTutorRuns(user.id)
      .then((runs) => {
        if (!cancelled) {
          const previous = runs.find(
            (run) => run.status === 'success' && run.recommendation,
          )
          setLastRunAt(previous?.createdAt ?? null)
          if (previous?.recommendation)
            setResult({
              runId: previous.id,
              requestId: previous.requestId,
              recommendation: previous.recommendation,
              trace: [],
              meta: {
                model: previous.model,
                promptVersion: previous.promptVersion,
                latencyMs: previous.latencyMs,
                inputTokens: previous.inputTokens,
                outputTokens: previous.outputTokens,
                estimatedCostUsd: previous.estimatedCostUsd,
              },
            })
        }
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load tutor history.')
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleGenerate() {
    if (!user || !canGenerate) return
    setIsLoading(true)
    setError(null)
    try {
      const next = await generateTutorSession(user.id)
      setResult(next)
      setLastRunAt(new Date().toISOString())
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to build a tutor session.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <Link to="/app/cards" className="text-link text-xs">
        Back to my learning
      </Link>
      <div className="panel px-6 py-6 sm:px-8">
        <p className="section-kicker">Your study guide</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">
              A little direction for your next step.
            </h1>
            <p className="muted-copy mt-2 max-w-3xl text-sm sm:text-base">
              Better Focus looks at what is due, what felt difficult recently
              and how your topic confidence is changing, then suggests a focused
              next session.
            </p>
            {mode === 'demo' ? (
              <p className="muted-copy mt-2 text-xs">
                Demo mode builds this recommendation from your local learning
                history.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading || !canGenerate}
            className="action-button h-11 px-5 text-sm"
          >
            {isLoading
              ? 'Finding your next step…'
              : result
                ? 'Refresh my recommendation'
                : 'Find my next step'}
          </button>
        </div>
        {!canGenerate ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Personalised study guidance is included with Better Focus Pro.
          </p>
        ) : null}
        {!isHistoryLoading && lastRunAt ? (
          <p className="muted-copy mt-4 text-xs">
            Last run: {new Date(lastRunAt).toLocaleString()}
          </p>
        ) : null}
      </div>
      {error ? (
        <div
          role="alert"
          className="panel border border-red-300 px-6 py-5 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      {!result && canGenerate && !isLoading ? (
        <div className="soft-card px-6 py-6 text-sm">
          <p className="font-semibold">Your reviews help point the way.</p>
          <p className="muted-copy mt-2">
            Practise a few questions, then get a recommendation that builds on
            what felt difficult.
          </p>
          <Link to="/app/cards" className="text-link mt-4">
            Open my learning
            <Icon name="arrow" />
          </Link>
        </div>
      ) : null}
      {result ? (
        <>
          <div className="panel px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Recommendation</p>
                <h3 className="mt-2 text-xl font-bold">
                  {result.recommendation.headline}
                </h3>
              </div>
              <span className="soft-card px-3 py-2 text-xs font-semibold">
                {result.recommendation.estimatedMinutes} min ·{' '}
                {result.recommendation.confidence} confidence
              </span>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="soft-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Focus topic
                </p>
                <p className="mt-2 text-lg font-bold">
                  {result.recommendation.focusTopic}
                </p>
                <p className="muted-copy mt-3 text-sm">
                  {result.recommendation.reason}
                </p>
              </div>
              <div className="soft-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session plan
                </p>
                <ol className="mt-3 space-y-3">
                  {result.recommendation.actions.map((action, index) => (
                    <li
                      key={`${index}-${action}`}
                      className="flex gap-3 text-sm"
                    >
                      <span className="font-bold text-reef">{index + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={topicPracticeUrl(result.recommendation.focusTopic, 'focus')}
              className="action-button"
            >
              Practise this topic
              <Icon name="arrow" />
            </Link>
            <Link to="/app/cards" className="ghost-button">
              Choose a different topic
            </Link>
          </div>
        </>
      ) : null}
    </section>
  )
}
