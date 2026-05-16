import { Link } from 'react-router-dom'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'

export function DashboardPage() {
  const { domains } = useBlockedDomains()
  const { cards } = useLearningCards()
  const { byokCredentialStatus, settings } = useAiAccess()
  const extensionStatus = useExtensionStatus()
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
        : 'Create manual cards or generate your first AI pack.',
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
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
          Keep today’s learning loop simple.
        </h2>
        <p className="muted-copy mt-3 max-w-2xl text-sm leading-6 sm:text-base">
          Jump into a review session, tune your library, or check whether your browser
          extension is still in sync.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/interrupt?source=dashboard" className="action-button">
            Start learning session
          </Link>
          <Link to="/app/cards" className="ghost-button">
            Manage learning cards
          </Link>
          <Link to="/app/pricing" className="ghost-button">
            Plans and usage
          </Link>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">Get set up</h3>
              <p className="muted-copy mt-2 text-sm leading-6">
                Follow these steps once, then the habit-interrupt loop can take over.
              </p>
            </div>
            <div className="rounded-full bg-reef/10 px-4 py-2 text-sm font-semibold text-reef">
              {onboardingSteps.filter((step) => step.done).length}/{onboardingSteps.length} complete
            </div>
          </div>
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
          {settings.planTier === 'byok' && !byokCredentialStatus ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              BYOK is selected, but there is no saved provider key on your account yet. Add one on the BYOK page before generating more packs.
            </div>
          ) : null}
        </div>
    </section>
  )
}
