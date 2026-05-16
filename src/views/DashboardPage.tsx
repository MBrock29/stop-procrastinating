import { Link } from 'react-router-dom'
import { useLearningCards } from '../features/cards/useLearningCards'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'

export function DashboardPage() {
  const { domains } = useBlockedDomains()
  const { cards } = useLearningCards()
  const extensionStatus = useExtensionStatus()
  const activeCount = domains.filter((item) => item.isActive).length
  const activeCardsCount = cards.filter((item) => !item.isArchived).length

  const extensionLabel =
    extensionStatus.status === 'connected'
      ? 'Connected'
      : extensionStatus.status === 'checking'
        ? 'Checking…'
        : 'Not connected'

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel overflow-hidden px-6 py-6 sm:px-8">
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
      </div>

      <div className="panel px-6 py-6 sm:px-8">
        <h3 className="text-lg font-bold text-ink dark:text-white">How sessions behave</h3>
        <ul className="muted-copy mt-4 space-y-3 text-sm">
          <li>Start a session any time without waiting for a blocked redirect.</li>
          <li>New or shaky cards surface first so the important gaps get attention.</li>
          <li>Confident cards stay in the library but drift toward the back of the queue.</li>
        </ul>
      </div>
    </section>
  )
}
