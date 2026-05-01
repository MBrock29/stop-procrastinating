export function DashboardPage() {
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
