import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBlockedDomains } from '../features/blocked-domains/useBlockedDomains';
import { syncExtensionRules } from '../features/extension/extensionBridge';
import { useExtensionStatus } from '../features/extension/useExtensionStatus';

export function BlockedDomainsPage() {
  const { addDomain, domains, error, isLoading, removeDomain, toggleDomain } =
    useBlockedDomains();
  const extensionStatus = useExtensionStatus();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const activeDomains = domains
    .filter((item) => item.isActive)
    .map((item) => item.domain);
  const [lastRequestedSyncSignature, setLastRequestedSyncSignature] = useState<string | null>(
    null,
  );

  function getDomainSignature(nextDomains: string[]) {
    return [...nextDomains].sort().join('|');
  }

  function queueStatusRefresh(delayMs = 600) {
    window.setTimeout(() => {
      void extensionStatus.refresh();
    }, delayMs);
  }

  function syncActiveDomains(nextActiveDomains: string[]) {
    syncExtensionRules(nextActiveDomains);
    setLastRequestedSyncSignature(getDomainSignature(nextActiveDomains));
    queueStatusRefresh();
  }

  function queueSyncRetry(nextActiveDomains: string[], delayMs = 1200) {
    window.setTimeout(() => {
      syncExtensionRules(nextActiveDomains);
      queueStatusRefresh(400);
    }, delayMs);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const rawDomain = String(formData.get('domain') ?? '');

    try {
      const created = await addDomain(rawDomain);
      const nextActiveDomains = [created.domain, ...activeDomains];
      syncActiveDomains(nextActiveDomains);
      queueSyncRetry(nextActiveDomains);
      form.reset();
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to save that domain.';
      setFormError(message);
    } finally {
      setPending(false);
    }
  }

  function handleManualSync() {
    setSyncMessage(null);
    syncExtensionRules(activeDomains);
    setLastRequestedSyncSignature(getDomainSignature(activeDomains));
    queueStatusRefresh();
    window.setTimeout(() => {
      void extensionStatus.refresh().then(() => {
        setSyncMessage(
          activeDomains.length === 0
            ? 'Extension checked. No active domains are currently available to sync.'
            : 'Sync request sent. If Chrome is open with the extension installed, it should now have your latest active rules.',
        );
      });
    }, 600);
  }

  async function handleToggleDomain(domainId: string, isActive: boolean) {
    await toggleDomain(domainId, isActive);

    const nextActiveDomains = domains
      .map((item) =>
        item.id === domainId ? { ...item, isActive } : item,
      )
      .filter((item) => item.isActive)
      .map((item) => item.domain);

    syncActiveDomains(nextActiveDomains);
    queueSyncRetry(nextActiveDomains);
  }

  async function handleRemoveDomain(domainId: string) {
    const nextActiveDomains = domains
      .filter((item) => item.id !== domainId && item.isActive)
      .map((item) => item.domain);

    await removeDomain(domainId);
    syncActiveDomains(nextActiveDomains);
    queueSyncRetry(nextActiveDomains);
  }

  const syncedDomainSignature = getDomainSignature(
    extensionStatus.details?.blockedDomains ?? [],
  );
  const desiredDomainSignature = getDomainSignature(activeDomains);
  const syncLooksCurrent =
    extensionStatus.status === 'connected' &&
    extensionStatus.details?.appBaseUrl === window.location.origin &&
    syncedDomainSignature === desiredDomainSignature;

  return (
    <div className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
      <section className='panel px-6 py-6 sm:px-8'>
        <p className='section-kicker'>Blocked sites</p>
        <h2 className='mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl'>
          Build your blocked sites list
        </h2>
        <p className='muted-copy mt-4 max-w-xl'>
          You can add a full URL like `https://www.reddit.com/r/funny` or a
          plain hostname like `reddit.com`. We normalise each entry into a
          domain rule so one item can cover the main site and its subdomains.
        </p>

        <form className='mt-8 space-y-4' onSubmit={handleSubmit}>
          <label className='block'>
            <span className='mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200'>
              Domain or URL
            </span>
            <input
              name='domain'
              type='text'
              placeholder='https://www.reddit.com/r/funny'
              className='app-input'
            />
          </label>
          {formError ? (
            <div className='rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
              {formError}
            </div>
          ) : null}
          <button type='submit' className='action-button' disabled={pending}>
            {pending ? 'Saving…' : 'Add blocked site'}
          </button>
        </form>

        <div className='soft-card mt-8 p-5 text-sm muted-copy'>
          <h3 className='text-base font-bold text-ink dark:text-white'>
            Normalisation examples
          </h3>
          <ul className='mt-3 space-y-2'>
            <li>{'`reddit.com` -> `reddit.com`'}</li>
            <li>{'`www.reddit.com` -> `reddit.com`'}</li>
            <li>
              {
                '`https://news.ycombinator.com/item?id=1` -> `news.ycombinator.com`'
              }
            </li>
          </ul>
        </div>

        <div className='mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm muted-copy'>
          <div className='flex flex-col gap-3'>
            <div>
              <h3 className='text-base font-bold text-ink dark:text-white'>
                Extension sync
              </h3>
              <p className='mt-1'>
                {extensionStatus.status === 'connected'
                  ? extensionStatus.isStale
                    ? 'The extension is connected, but the last sync looks old. Your blocked-site changes should usually update automatically, but you can use the button here to manually refresh the rules.'
                    : syncLooksCurrent
                      ? 'Your blocked-site changes should usually update automatically. Use the button here if you want to manually refresh the extension rules.'
                      : 'The extension is connected and a rules update has been sent. If the latest blocked site has not kicked in yet, the app will keep nudging the extension in the background and you can still use the manual refresh button below.'
                  : 'If the extension is installed, your active rules should usually sync automatically. Use the button here if you want to try a manual refresh from the app.'}
              </p>
              {lastRequestedSyncSignature && !syncLooksCurrent ? (
                <p className='mt-2 text-sm text-slate-500 dark:text-slate-300'>
                  Waiting for the extension to confirm the newest blocked-site rules.
                </p>
              ) : null}
              {extensionStatus.details?.lastSyncedAt ? (
                <p className='mt-2 text-sm text-slate-500 dark:text-slate-300'>
                  Last synced{' '}
                  {new Date(
                    extensionStatus.details.lastSyncedAt,
                  ).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type='button'
            className='ghost-button mt-4 w-full text-sm'
            onClick={handleManualSync}
          >
            Manual refresh
          </button>
          {syncMessage ? (
            <div className='mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'>
              {syncMessage}
            </div>
          ) : null}
          {extensionStatus.status !== 'connected' ? (
            <div className='mt-4 text-sm'>
              <Link to='/app/setup' className='font-semibold text-reef'>
                Open the setup guide
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className='panel px-6 py-6 sm:px-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='section-kicker'>Active rules</p>
            <h3 className='mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl'>
              {domains.length} domain{domains.length === 1 ? '' : 's'}{' '}
              configured
            </h3>
          </div>
        </div>

        {error ? (
          <div className='mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className='soft-card mt-6 px-4 py-8 text-center text-sm muted-copy'>
            Loading your blocked domains…
          </div>
        ) : null}

        {!isLoading && domains.length === 0 ? (
          <div className='soft-card mt-6 border-dashed px-5 py-8 text-sm muted-copy'>
            No blocked domains yet. Add your first habit-trigger site to start
            shaping the redirect behavior.
          </div>
        ) : null}

        <div className='mt-6 space-y-4'>
          {domains.map((domain) => (
            <article
              key={domain.id}
              className='rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-5 py-5'
            >
              <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='text-lg font-bold text-ink dark:text-white'>
                    {domain.domain}
                  </div>
                  <div className='mt-1 text-sm text-slate-500 dark:text-slate-300'>
                    {domain.isActive
                      ? 'Active and ready to sync'
                      : 'Paused for now'}
                  </div>
                </div>
                <div className='flex flex-wrap gap-3'>
                  <button
                    type='button'
                    className='ghost-button'
                    onClick={() => void handleToggleDomain(domain.id, !domain.isActive)}
                  >
                    {domain.isActive ? 'Pause rule' : 'Resume rule'}
                  </button>
                  <button
                    type='button'
                    className='rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100'
                    onClick={() => void handleRemoveDomain(domain.id)}
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
  );
}
