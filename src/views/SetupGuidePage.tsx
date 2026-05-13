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
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">
              Current status
            </h3>
            <p className="mt-4 text-sm text-slate-600">
              You are right: a normal user cannot run `npm run build:extension`. That is
              only for local development. To make this a proper end-user install, the
              extension needs to be packaged and published through the Chrome Web Store,
              or distributed as a signed release package.
            </p>
          </article>

          <article className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">Chrome</h3>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Install the extension from the Chrome Web Store once it is published.</li>
              <li>2. Open the extension popup to confirm it is available in Chrome.</li>
              <li>3. Return to this app and use `Sync browser extension` on Blocked sites.</li>
              <li>4. Visit one of your blocked domains to confirm the redirect works.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h3 className="text-2xl font-extrabold tracking-tight text-ink">What needs building next</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>Package the extension into a release build that can be distributed outside the repo.</li>
          <li>Publish it to the Chrome Web Store so users can install it without developer tools.</li>
          <li>Point the published extension at the deployed production app rather than localhost.</li>
          <li>Keep the dashboard status check so users can immediately see whether the extension is connected.</li>
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
