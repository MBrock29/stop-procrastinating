import type { FormEvent } from 'react'
import { useState } from 'react'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { syncExtensionRules } from '../features/extension/extensionBridge'

export function BlockedDomainsPage() {
  const { addDomain, domains, error, isLoading, removeDomain, toggleDomain } =
    useBlockedDomains()
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const activeDomains = domains.filter((item) => item.isActive).map((item) => item.domain)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFormError(null)

    const formData = new FormData(event.currentTarget)
    const rawDomain = String(formData.get('domain') ?? '')

    try {
      await addDomain(rawDomain)
      event.currentTarget.reset()
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to save that domain.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  function handleManualSync() {
    syncExtensionRules(activeDomains)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
          Blocked sites
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          Build the domains your extension should intercept
        </h2>
        <p className="mt-4 max-w-xl text-slate-600">
          Paste a full URL or plain hostname. We normalize it to a domain rule so one
          entry can cover the main site and its subdomains.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Domain or URL
            </span>
            <input
              name="domain"
              type="text"
              placeholder="https://www.reddit.com/r/reactjs"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
            />
          </label>
          {formError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {formError}
            </div>
          ) : null}
          <button type="submit" className="action-button" disabled={pending}>
            {pending ? 'Saving…' : 'Add blocked site'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">
          <h3 className="text-base font-bold text-ink">Normalization examples</h3>
          <ul className="mt-3 space-y-2">
            <li>{'`reddit.com` -> `reddit.com`'}</li>
            <li>{'`www.reddit.com` -> `reddit.com`'}</li>
            <li>
              {
                '`https://news.ycombinator.com/item?id=1` -> `news.ycombinator.com`'
              }
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-5 text-sm text-slate-600">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-ink">Extension sync</h3>
              <p className="mt-1">
                If the extension is installed, this sends your active rules to it from the
                app.
              </p>
            </div>
            <button type="button" className="ghost-button" onClick={handleManualSync}>
              Sync browser extension
            </button>
          </div>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
              Active rules
            </p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-ink">
              {domains.length} domain{domains.length === 1 ? '' : 's'} configured
            </h3>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            Loading your blocked domains…
          </div>
        ) : null}

        {!isLoading && domains.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            No blocked domains yet. Add your first habit-trigger site to start shaping
            the redirect behavior.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {domains.map((domain) => (
            <article
              key={domain.id}
              className="rounded-3xl border border-slate-200 bg-white px-5 py-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-bold text-ink">{domain.domain}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {domain.isActive ? 'Active and ready to sync' : 'Paused for now'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void toggleDomain(domain.id, !domain.isActive)}
                  >
                    {domain.isActive ? 'Pause rule' : 'Resume rule'}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100"
                    onClick={() => void removeDomain(domain.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
