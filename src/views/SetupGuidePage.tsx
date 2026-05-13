import { Link } from 'react-router-dom'

export function SetupGuidePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
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

        <div className="mt-8 space-y-5">
          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">Chrome</h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Run `npm run build:extension` from the project root.</li>
              <li>2. Open `chrome://extensions` in Chrome.</li>
              <li>3. Turn on `Developer mode` in the top right.</li>
              <li>4. Click `Load unpacked` and select `extension/dist`.</li>
              <li>5. Return to this app and use `Sync browser extension` on Blocked sites.</li>
              <li>6. Visit one of your blocked domains to confirm the redirect works.</li>
            </ol>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">Firefox</h3>
            <p className="mt-4 text-sm text-slate-600">
              Firefox is not connected by this build yet. The project currently ships as
              a Chrome-first Manifest V3 extension, so it would need a Firefox add-on
              package and compatibility pass before these steps would work there.
            </p>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">
              Internet Explorer
            </h3>
            <p className="mt-4 text-sm text-slate-600">
              Internet Explorer is not supported. It does not support the modern
              extension platform this project uses, so the extension cannot be connected
              there.
            </p>
          </article>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h3 className="text-2xl font-extrabold tracking-tight text-ink">After install</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>Open the extension popup to check that it has loaded.</li>
          <li>Use the Blocked sites page to sync your active rules into the extension.</li>
          <li>The dashboard will show `Connected` after the extension responds and has a recent sync.</li>
          <li>If the status still shows `Not connected`, rebuild the extension and reload it in the browser.</li>
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
