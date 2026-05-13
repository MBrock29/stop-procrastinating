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
      <div className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
          Dashboard
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/interrupt?source=dashboard" className="action-button">
            Start learning session
          </Link>
          <Link to="/app/cards" className="ghost-button">
            Manage learning cards
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Active blocks
            </div>
            <div className="mt-3 text-3xl font-bold text-ink">{activeCount}</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Active cards
            </div>
            <div className="mt-3 text-3xl font-bold text-ink">{activeCardsCount}</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Browser extension
            </div>
            <div className="mt-3 text-lg font-bold text-ink">{extensionLabel}</div>
            {extensionStatus.status === 'connected' && extensionStatus.details?.lastSyncedAt ? (
              <div className="mt-2 text-sm text-slate-500">
                Synced {new Date(extensionStatus.details.lastSyncedAt).toLocaleString()}
              </div>
            ) : (
              <Link to="/app/sites" className="mt-2 inline-block text-sm font-semibold text-reef">
                View extension setup guide
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="panel px-6 py-6">
        <h3 className="text-lg font-bold text-ink">How learning works now</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>Start a learning session any time from the dashboard.</li>
          <li>Unmarked and not-confident cards show up first.</li>
          <li>Semi-confident cards come after that, and confident cards last.</li>
        </ul>
      </div>
    </section>
  )
}
