export function BlockedDomainsPage() {
  return (
    <section className="panel px-6 py-6 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
        Blocked sites
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        Domain rules will live here
      </h2>
      <p className="mt-4 max-w-2xl text-slate-600">
        Users will be able to paste full URLs, and the app will normalize them into
        reusable domain-level rules for the extension.
      </p>
    </section>
  )
}
