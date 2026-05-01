import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'

export function DashboardPage() {
  const { domains } = useBlockedDomains()
  const activeCount = domains.filter((item) => item.isActive).length

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel px-6 py-6 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
          Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          Your anti-drift command center
        </h2>
        <p className="mt-4 max-w-2xl text-slate-600">
          This scaffold already separates the core surfaces we need for the product:
          site rules, learning cards, and redirect-driven interrupts.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Active blocks
            </div>
            <div className="mt-3 text-3xl font-bold text-ink">{activeCount}</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Review flow
            </div>
            <div className="mt-3 text-lg font-bold text-ink">Planned next</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Browser sync
            </div>
            <div className="mt-3 text-lg font-bold text-ink">Extension-ready</div>
          </div>
        </div>
      </div>

      <div className="panel px-6 py-6">
        <h3 className="text-lg font-bold text-ink">Next steps in the build</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>Connect Supabase auth and route guards.</li>
          <li>Add blocked-domain management and normalization.</li>
          <li>Wire review scheduling and interrupt sessions.</li>
        </ul>
      </div>
    </section>
  )
}
