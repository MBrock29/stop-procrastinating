import { Link } from 'react-router-dom'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'

const chromeStoreUrl =
  'https://chromewebstore.google.com/detail/better-focus/nfnolfdknehkaligmklfcnganbnmlmll'

export function SetupGuidePage() {
  const extensionStatus = useExtensionStatus()

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef">
          Setup guide
        </p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
          Install the Chrome extension
        </h2>
        <p className="mt-4 max-w-2xl text-slate-600">
          Better Focus works with the Chrome extension so blocked sites can redirect
          straight into your learning flow. Once it is installed, your blocked-site
          changes should usually sync automatically from the app.
        </p>

        <div className="mt-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
          <div className="font-semibold text-ink dark:text-white">
            {extensionStatus.status === 'connected'
              ? extensionStatus.isStale
                ? 'Extension found, but it should be refreshed again'
                : 'Extension detected'
              : extensionStatus.status === 'checking'
                ? 'Checking for the extension'
                : 'Extension not detected from this browser tab'}
          </div>
          <div className="muted-copy mt-2 leading-6">
            {extensionStatus.status === 'connected'
              ? `The app can see the extension and currently reports ${extensionStatus.details?.blockedDomains.length ?? 0} synced blocked domain${(extensionStatus.details?.blockedDomains.length ?? 0) === 1 ? '' : 's'}.`
              : 'Install the extension from the Chrome Web Store, then return to this app in the same browser so Better Focus can detect it.'}
          </div>
          {extensionStatus.details?.lastSyncedAt ? (
            <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
              Last synced {new Date(extensionStatus.details.lastSyncedAt).toLocaleString()}
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-5">
          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">
              How to get started
            </h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Open the extension listing in the Chrome Web Store.</li>
              <li>
                2.{' '}
                <a
                  href={chromeStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-reef underline decoration-reef/40 underline-offset-4 transition hover:decoration-reef"
                >
                  Add the Better Focus extension
                </a>{' '}
                to Chrome.
              </li>
              <li>3. Return to Better Focus in the same browser.</li>
              <li>4. Add at least one blocked site in the app.</li>
              <li>5. Visit one of your blocked sites to confirm the redirect works.</li>
            </ol>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">
              What to know
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Blocked-site changes should usually sync automatically once the extension is installed.</li>
              <li>If the extension looks stale, you can use the manual refresh action from the app.</li>
              <li>Make sure you are using the same Chrome profile for both the app and the extension.</li>
              <li>If redirects are not happening, confirm the rule is active in your blocked-sites list.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h3 className="text-2xl font-extrabold tracking-tight text-ink">
          Quick links
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>Install the extension from the Chrome Web Store.</li>
          <li>Open Blocked sites to add or review your active redirect rules.</li>
          <li>Open Learning cards to make sure you have cards ready for redirects.</li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={chromeStoreUrl} target="_blank" rel="noreferrer" className="ghost-button">
            Open Chrome Web Store
          </a>
          <Link to="/app/sites" className="ghost-button">
            Go to blocked sites
          </Link>
        </div>
      </section>
    </div>
  )
}
