import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'
import { trackProductEvent } from '../features/product/productExperience'
import type { BlockedDomain, InterventionMode } from '../types/domain'
import { Icon } from '../ui/Icon'

type Controls = Parameters<
  ReturnType<typeof useBlockedDomains>['updateControls']
>[1]
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const labels: Record<InterventionMode, string> = {
  quick: 'One question',
  focus: 'Three questions',
  intentional: 'Pause with intention',
  soft: 'Gentle reminder',
  hard: 'Answer first',
  smart: 'Adaptive practice',
}

function SiteControls({
  domain,
  busy,
  onSave,
}: {
  domain: BlockedDomain
  busy: boolean
  onSave: (input: Controls) => Promise<void>
}) {
  const [draft, setDraft] = useState<Controls>({
    scheduleDays: domain.scheduleDays,
    scheduleAllDay: domain.scheduleAllDay,
    scheduleStart: domain.scheduleStart,
    scheduleEnd: domain.scheduleEnd,
    interventionMode: domain.interventionMode,
    pausedUntil: domain.pausedUntil,
  })
  return (
    <form
      className="mt-5 space-y-5 border-t border-[var(--app-border)] pt-5"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({ ...draft, pausedUntil: domain.pausedUntil })
      }}
    >
      <label className="block text-sm font-semibold">
        How should Better Focus interrupt?
        <select
          className="app-input mt-2"
          value={draft.interventionMode}
          onChange={(event) =>
            setDraft({
              ...draft,
              interventionMode: event.target.value as InterventionMode,
            })
          }
        >
          <option value="quick">One question · recommended</option>
          <option value="focus">
            Three questions · a little more practice
          </option>
          <option value="intentional">
            Pause with intention · name your reason
          </option>
          <optgroup label="Advanced">
            <option value="soft">Gentle reminder · immediate bypass</option>
            <option value="hard">Answer first · you can always leave</option>
            <option value="smart">
              Adaptive practice · one or three questions
            </option>
          </optgroup>
        </select>
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Days to protect</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {weekdays.map((day, index) => (
            <button
              key={day}
              type="button"
              aria-pressed={draft.scheduleDays.includes(index)}
              className={`ghost-button min-w-11 px-3 py-2 text-xs ${draft.scheduleDays.includes(index) ? 'border-reef bg-reef/10 text-reef' : ''}`}
              onClick={() =>
                setDraft({
                  ...draft,
                  scheduleDays: draft.scheduleDays.includes(index)
                    ? draft.scheduleDays.filter((item) => item !== index)
                    : [...draft.scheduleDays, index].sort(),
                })
              }
            >
              {day}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={draft.scheduleAllDay}
          onChange={(event) =>
            setDraft({ ...draft, scheduleAllDay: event.target.checked })
          }
        />
        <span>
          <strong className="block">Protect all day</strong>
          <span className="muted-copy mt-1 block text-xs">
            All hours on the selected days, including midnight. Uncheck to
            choose specific times.
          </span>
        </span>
      </label>
      {!draft.scheduleAllDay ? (
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-semibold">
            From
            <input
              required
              type="time"
              className="app-input mt-2"
              value={draft.scheduleStart}
              onChange={(event) =>
                setDraft({ ...draft, scheduleStart: event.target.value })
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Until
            <input
              required
              type="time"
              className="app-input mt-2"
              value={draft.scheduleEnd}
              onChange={(event) =>
                setDraft({ ...draft, scheduleEnd: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}
      <p className="text-xs muted-copy">
        Uses your computer's local time. An overnight schedule continues into
        the following morning.
      </p>
      <button
        className="action-button"
        disabled={busy || !draft.scheduleDays.length}
      >
        {busy ? 'Saving…' : 'Save schedule'}
      </button>
    </form>
  )
}

export function BlockedDomainsPage() {
  const { user } = useAuth()
  const {
    addDomain,
    domains,
    error,
    isLoading,
    removeDomain,
    toggleDomain,
    updateControls,
  } = useBlockedDomains()
  const extension = useExtensionStatus()
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function action(work: () => Promise<unknown>, success?: string) {
    setPending(true)
    setFormError(null)
    setMessage(null)
    try {
      await work()
      if (success) setMessage(success)
    } catch (next) {
      setFormError(
        next instanceof Error
          ? next.message
          : 'Unable to save your changes. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    await action(async () => {
      await addDomain(input)
      setInput('')
    }, 'Site added. Protected all day, every day by default.')
  }

  async function saveControls(
    domain: BlockedDomain,
    changes: Partial<Controls>,
  ) {
    await action(async () => {
      await updateControls(domain.id, { ...domain, ...changes })
    }, 'Your changes are saved and will sync to Chrome.')
  }

  return (
    <div className="space-y-7">
      <div className="page-heading">
        <div>
          <p className="section-kicker">Make room for what matters</p>
          <h1 className="page-title mt-2">Your distractions.</h1>
          <p className="muted-copy mt-3 text-sm">
            A useful pause on the sites you open on autopilot. On your terms.
          </p>
        </div>
        <Link to="/interrupt?source=test" className="ghost-button">
          Try an interruption
          <Icon name="arrow" />
        </Link>
      </div>
      {extension.status !== 'connected' ? (
        <div className="soft-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Icon name="shield" />
            <p className="text-sm">
              <strong>Connect Chrome to activate these rules.</strong>
              <span className="mt-1 block muted-copy">
                Your schedule is saved here; the extension catches the actual
                visits.
              </span>
            </p>
          </div>
          <Link to="/app/setup" className="text-link">
            Connect extension
            <Icon name="arrow" />
          </Link>
        </div>
      ) : (
        <p className="status-pill">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Chrome connected · changes sync automatically
        </p>
      )}
      <form
        onSubmit={(event) => void add(event)}
        className="panel flex flex-wrap items-end gap-3 p-5"
      >
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Add a distracting site
          <input
            required
            className="app-input mt-2"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="reddit.com or paste a website URL"
          />
        </label>
        <button className="action-button" disabled={pending}>
          <Icon name="plus" />
          Add site
        </button>
        <p className="w-full text-xs muted-copy">
          Includes the site's subdomains. Protected all day, every day by
          default. You can set optional days and hours in preferences.
        </p>
      </form>
      {formError || error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {formError ?? error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </p>
      ) : null}
      {isLoading && !domains.length ? (
        <p role="status" className="muted-copy">
          Loading your sites…
        </p>
      ) : null}
      {!isLoading && !domains.length ? (
        <div className="empty-state">
          <span className="feature-icon">
            <Icon name="shield" />
          </span>
          <h2 className="mt-4 text-xl font-bold">
            Where does your attention go?
          </h2>
          <p className="muted-copy mt-2 text-sm">
            Add the first site you would like a little help with.
          </p>
        </div>
      ) : null}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {domains.map((domain) => {
          const snoozed = Boolean(
            domain.pausedUntil && new Date(domain.pausedUntil) > new Date(),
          )
          const days =
            domain.scheduleDays.length === 7
              ? 'Every day'
              : domain.scheduleDays.every((day) => day > 0 && day < 6) &&
                  domain.scheduleDays.length === 5
                ? 'Weekdays'
                : domain.scheduleDays.map((day) => weekdays[day]).join(', ')
          return (
            <article key={domain.id} className="panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="feature-icon font-bold">
                    {domain.domain[0].toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-bold">{domain.domain}</h2>
                    <p className="mt-1 text-xs muted-copy">
                      {!domain.isActive
                        ? 'Paused'
                        : snoozed
                          ? 'Snoozed'
                          : domain.scheduleAllDay &&
                              domain.scheduleDays.length === 7
                            ? 'Always on'
                            : 'Scheduled'}{' '}
                      · {labels[domain.interventionMode]}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className="text-link text-xs"
                  onClick={() =>
                    void action(async () => {
                      await toggleDomain(domain.id, !domain.isActive)
                      if (user)
                        void trackProductEvent(
                          user.id,
                          domain.isActive
                            ? 'site_rule_paused'
                            : 'site_rule_resumed',
                        )
                    })
                  }
                >
                  {domain.isActive ? 'Pause' : 'Resume'}
                </button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm muted-copy">
                <Icon name="clock" />
                {days} ·{' '}
                {domain.scheduleAllDay
                  ? 'All day'
                  : `${domain.scheduleStart}–${domain.scheduleEnd}`}
              </p>
              {snoozed ? (
                <p className="mt-2 text-xs muted-copy">
                  Resumes at{' '}
                  {new Date(domain.pausedUntil!).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <details className="w-full">
                  <summary className="text-sm font-semibold text-reef">
                    Schedule & preferences
                  </summary>
                  <SiteControls
                    domain={domain}
                    busy={pending}
                    onSave={(input) => saveControls(domain, input)}
                  />
                </details>
                <button
                  type="button"
                  disabled={pending}
                  className="text-link text-xs"
                  onClick={() =>
                    void saveControls(domain, {
                      pausedUntil: snoozed
                        ? null
                        : new Date(Date.now() + 30 * 60_000).toISOString(),
                    })
                  }
                >
                  {snoozed ? 'End snooze' : 'Snooze 30 min'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs muted-copy hover:text-rose-700"
                  onClick={() => setDeleteId(domain.id)}
                >
                  Remove site
                </button>
              </div>
              {deleteId === domain.id ? (
                <div className="mt-4 rounded-xl border border-rose-200 p-4">
                  <p className="text-sm">
                    Remove {domain.domain}? You can add it again later.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      className="ghost-button px-3 py-2 text-xs"
                      onClick={() => setDeleteId(null)}
                    >
                      Keep site
                    </button>
                    <button
                      className="ghost-button px-3 py-2 text-xs text-rose-700"
                      disabled={pending}
                      onClick={() =>
                        void action(async () => {
                          await removeDomain(domain.id)
                          setDeleteId(null)
                        }, 'Site removed.')
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
