import { Link } from 'react-router-dom'
import { useExtensionStatus } from '../features/extension/useExtensionStatus'

export function SetupGuidePage() {
  const extensionStatus = useExtensionStatus()

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef">
          Setup Guide
        </p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
          Connect the browser extension
        </h2>
        <p className="mt-4 max-w-2xl text-slate-600">
          The current extension build is made for Chrome and other Chromium-based
          browsers. Once it is connected, your blocked site rules can sync from the app
          and redirects will send you into a learning session.
        </p>

        <div className="mt-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm">
          <div className="font-semibold text-ink dark:text-white">
            {extensionStatus.status === 'connected'
              ? extensionStatus.isStale
                ? 'Extension found, but it should be synced again'
                : 'Extension detected'
              : extensionStatus.status === 'checking'
                ? 'Checking for the extension'
                : 'Extension not detected from this browser tab'}
          </div>
          <div className="muted-copy mt-2 leading-6">
            {extensionStatus.status === 'connected'
              ? `The app can see the extension and currently reports ${extensionStatus.details?.blockedDomains.length ?? 0} synced blocked domain${(extensionStatus.details?.blockedDomains.length ?? 0) === 1 ? '' : 's'}.`
              : 'If you have the extension installed already, open Chrome with the app and extension together, then try syncing again from Blocked sites.'}
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
              Local testing in Chrome
            </h3>
            <p className="mt-4 text-sm text-slate-600">
              For local development, build the extension once, load it in
              `chrome://extensions`, then keep the app open in the same browser profile.
              The app can only talk to the extension from Chrome where the content script is active.
            </p>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">Chrome</h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Build the extension locally with `npm run build:extension`.</li>
              <li>2. Open `chrome://extensions`, turn on Developer mode, and load `extension/dist`.</li>
              <li>3. Open this app in the same Chrome profile and add at least one blocked site.</li>
              <li>4. Use `Sync browser extension` on Blocked sites to send your latest active rules.</li>
              <li>5. Visit one of your blocked domains to confirm the redirect works.</li>
            </ol>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">Troubleshooting</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Make sure the app and extension are open in Chrome, not a different browser.</li>
              <li>Re-sync after adding, removing, or pausing blocked sites.</li>
              <li>If the dashboard says the sync is stale, use `Sync browser extension` again.</li>
              <li>If redirects are not happening, confirm the site is active in your blocked-sites list.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h3 className="text-2xl font-extrabold tracking-tight text-ink">What this page helps you check</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>The extension can be detected from the app in your current browser.</li>
          <li>Your blocked sites can be synced into the extension.</li>
          <li>You have enough cards in the library for redirects to show something useful.</li>
          <li>You know where to go when the extension is installed but not syncing correctly.</li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/app/sites" className="action-button">
            Go to blocked sites
          </Link>
          <Link to="/app" className="ghost-button">
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  )
}
