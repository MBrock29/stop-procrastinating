import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  canAccessByok,
  canAccessUsageTab,
} from '../features/ai-access/byokVisibility'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import {
  ConfidenceBreakdownChart,
  TopicInsightList,
  WeeklyReviewChart,
} from '../features/insights/InsightsCharts'
import { useLearningInsights } from '../features/insights/useLearningInsights'

const demoDailyReviews = [
  { label: 'Mon', total: 8, know: 4, semi: 2, notConfident: 2 },
  { label: 'Tue', total: 11, know: 5, semi: 4, notConfident: 2 },
  { label: 'Wed', total: 7, know: 3, semi: 3, notConfident: 1 },
  { label: 'Thu', total: 13, know: 7, semi: 4, notConfident: 2 },
  { label: 'Fri', total: 10, know: 5, semi: 3, notConfident: 2 },
  { label: 'Sat', total: 6, know: 2, semi: 2, notConfident: 2 },
  { label: 'Sun', total: 9, know: 4, semi: 3, notConfident: 2 },
]

const demoWeakestTopics = [
  {
    topic: 'System design basics',
    totalCards: 12,
    knowCount: 3,
    semiCount: 4,
    notConfidentCount: 5,
    score: 0.42,
  },
  {
    topic: 'React performance',
    totalCards: 10,
    knowCount: 3,
    semiCount: 4,
    notConfidentCount: 3,
    score: 0.5,
  },
]

const demoStrongestTopics = [
  {
    topic: 'JavaScript fundamentals',
    totalCards: 14,
    knowCount: 10,
    semiCount: 3,
    notConfidentCount: 1,
    score: 0.86,
  },
  {
    topic: 'HTML and CSS',
    totalCards: 9,
    knowCount: 6,
    semiCount: 2,
    notConfidentCount: 1,
    score: 0.78,
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { domains } = useBlockedDomains()
  const { cards } = useLearningCards()
  const { byokCredentialStatus, settings } = useAiAccess()
  const extensionStatus = useExtensionStatus()
  const insights = useLearningInsights(cards)
  const showByok = canAccessByok(user?.email)
  const showUsageTab = canAccessUsageTab(user?.email)
  const showPremiumInsights = settings.planTier === 'premium'
  const activeCount = domains.filter((item) => item.isActive).length
  const activeCardsCount = cards.filter((item) => !item.isArchived).length
  const hasAnyCards = cards.length > 0
  const hasExtensionConnection = extensionStatus.status === 'connected'
  const onboardingSteps = [
    {
      label: 'Connect the browser extension',
      done: hasExtensionConnection,
      description: hasExtensionConnection
        ? extensionStatus.isStale
          ? 'The extension is connected, but the last sync looks old.'
          : 'Chrome extension is connected and can receive fresh rules.'
        : 'Install or reopen the extension in Chrome, then sync from the app.',
      actionHref: hasExtensionConnection ? '/app/sites' : '/app/setup',
      actionLabel: hasExtensionConnection ? 'Sync extension' : 'Setup guide',
    },
    {
      label: 'Add learning cards',
      done: hasAnyCards,
      description: hasAnyCards
        ? `${cards.length} card${cards.length === 1 ? '' : 's'} ready to review.`
        : 'Generate your first AI pack to start building your library.',
      actionHref: '/app/cards',
      actionLabel: hasAnyCards ? 'Open cards' : 'Add cards',
    },
    {
      label: 'Choose blocked sites',
      done: activeCount > 0,
      description: activeCount > 0
        ? `${activeCount} active blocked site rule${activeCount === 1 ? '' : 's'} configured.`
        : 'Add the sites you want to interrupt and redirect.',
      actionHref: '/app/sites',
      actionLabel: activeCount > 0 ? 'Review sites' : 'Add blocked sites',
    },
  ]
  const completedSetupSteps = onboardingSteps.filter((step) => step.done).length
  const setupIsComplete = completedSetupSteps === onboardingSteps.length
  const [isSetupOpen, setIsSetupOpen] = useState(!setupIsComplete)
  const previewDailyReviews = showPremiumInsights
    ? insights.dailyReviews
    : demoDailyReviews
  const previewKnowReviews = showPremiumInsights ? insights.metrics.knowReviews : 36
  const previewSemiReviews = showPremiumInsights ? insights.metrics.semiReviews : 21
  const previewNotConfidentReviews = showPremiumInsights
    ? insights.metrics.notConfidentReviews
    : 14
  const previewWeakestTopics = showPremiumInsights
    ? insights.weakestTopics
    : demoWeakestTopics
  const previewStrongestTopics = showPremiumInsights
    ? insights.strongestTopics
    : demoStrongestTopics

  useEffect(() => {
    setIsSetupOpen(!setupIsComplete)
  }, [setupIsComplete])

  const extensionLabel =
    extensionStatus.status === 'connected'
      ? extensionStatus.isStale
        ? 'Needs re-sync'
        : 'Connected'
      : extensionStatus.status === 'checking'
        ? 'Checking…'
        : 'Not connected'

  return (
    <section className="panel overflow-hidden px-6 py-6 sm:px-8">
        <p className="section-kicker">
          Dashboard
        </p>
        <p className="muted-copy mt-4 max-w-2xl text-sm leading-6 sm:text-base">
          Jump into a review session, tune your library, or check whether your browser
          extension is still in sync.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app" className="action-button">
            Overview
          </Link>
          <Link to="/app/cards" className="ghost-button">
            Manage learning cards
          </Link>
          <Link to="/app/pricing" className="ghost-button">
            Pricing plans
          </Link>
          {showUsageTab ? (
            <Link to="/app/byok#usage" className="ghost-button">
              Usage
            </Link>
          ) : null}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Active blocks
            </div>
            <div className="mt-3 text-3xl font-bold text-ink dark:text-white">{activeCount}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Active cards
            </div>
            <div className="mt-3 text-3xl font-bold text-ink dark:text-white">{activeCardsCount}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Browser extension
            </div>
            <div className="mt-3 text-lg font-bold text-ink dark:text-white">{extensionLabel}</div>
            {extensionStatus.status === 'connected' && extensionStatus.details?.lastSyncedAt ? (
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Synced {new Date(extensionStatus.details.lastSyncedAt).toLocaleString()}
              </div>
            ) : (
              <Link to="/app/setup" className="mt-2 inline-block text-sm font-semibold text-reef">
                View extension setup guide
              </Link>
            )}
          </div>
        </div>

        <div className="soft-card mt-8 p-5">
          <button
            type="button"
            onClick={() => setIsSetupOpen((current) => !current)}
            className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-3">
                <h3 className="text-lg font-bold text-ink dark:text-white">Get set up</h3>
                <span
                  className={[
                    'inline-flex -translate-y-px items-center justify-center text-xl font-black leading-none text-ink transition dark:text-white',
                    isSetupOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </div>
              {isSetupOpen ? (
                <p className="muted-copy mt-2 text-sm leading-6">
                  Follow these steps once, then the habit-interrupt loop can take over.
                </p>
              ) : null}
            </div>
            <div className="rounded-full bg-reef/10 px-4 py-2 text-sm font-semibold text-reef">
              {completedSetupSteps}/{onboardingSteps.length} complete
            </div>
          </button>
          {isSetupOpen ? (
            <div className="mt-5 space-y-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.label}
                  className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {step.done ? '✓' : index + 1}
                        </div>
                        <div className="text-base font-bold text-ink dark:text-white">{step.label}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        {step.description}
                      </div>
                    </div>
                    <Link to={step.actionHref} className="ghost-button">
                      {step.actionLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {showByok && settings.planTier === 'byok' && !byokCredentialStatus ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              BYOK is selected, but there is no saved provider key on your account yet. Add one on the BYOK page before generating more packs.
            </div>
          ) : null}
        </div>

        <div className="soft-card mt-8 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">Learning insights</h3>
              <p className="muted-copy mt-2 text-sm leading-6">
                Track momentum, confidence, and the topics that need more attention.
              </p>
            </div>
            <div
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold',
                showPremiumInsights
                  ? 'bg-reef/10 text-reef'
                  : 'bg-rose-50 text-rose-700',
              ].join(' ')}
            >
              {showPremiumInsights ? 'Premium active' : 'Premium feature'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl bg-[var(--app-surface-strong)] px-4 py-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Total reviews
              </div>
              <div className="mt-3 text-4xl font-extrabold text-ink dark:text-white">
                {insights.metrics.totalReviews}
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--app-surface-strong)] px-4 py-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Know rate
              </div>
              <div className="mt-3 text-4xl font-extrabold text-ink dark:text-white">
                {insights.metrics.confidenceRate}%
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--app-surface-strong)] px-4 py-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Active cards
              </div>
              <div className="mt-3 text-4xl font-extrabold text-ink dark:text-white">
                {insights.metrics.activeCards}
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--app-surface-strong)] px-4 py-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Archived cards
              </div>
              <div className="mt-3 text-4xl font-extrabold text-ink dark:text-white">
                {insights.metrics.archivedCards}
              </div>
            </div>
          </div>

          {insights.error ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {insights.error}
            </div>
          ) : null}

          {!showPremiumInsights ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              Please upgrade to premium for this feature.
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <WeeklyReviewChart snapshots={previewDailyReviews} />
            <ConfidenceBreakdownChart
              know={previewKnowReviews}
              semi={previewSemiReviews}
              notConfident={previewNotConfidentReviews}
            />
            <TopicInsightList
              title="Weakest topics"
              subtitle="The areas where confidence is lagging most"
              items={previewWeakestTopics}
            />
            <TopicInsightList
              title="Strongest topics"
              subtitle="The areas where your review confidence is strongest"
              items={previewStrongestTopics}
            />
          </div>
        </div>
    </section>
  )
}
