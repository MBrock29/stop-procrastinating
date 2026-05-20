import { Link } from 'react-router-dom'
import { isByokPubliclyVisible } from '../features/ai-access/byokVisibility'

const lastUpdated = 'May 17, 2026'

export function PrivacyPolicyPage() {
  const showByok = isByokPubliclyVisible()

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="panel px-6 py-8 sm:px-10">
          <p className="section-kicker">Privacy Policy</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-4xl">
            Better Focus Privacy Policy
          </h1>
          <p className="muted-copy mt-4 text-sm leading-6 sm:text-base">
            Last updated {lastUpdated}
          </p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700 dark:text-slate-200 sm:text-base">
            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">Overview</h2>
              <p className="mt-3">
                Better Focus helps users interrupt distracting website visits and redirect
                them into short learning sessions. This policy explains what information the
                Better Focus website and Chrome extension handle, how that information is
                used, and the choices available to users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                Information we handle
              </h2>
              <ul className="mt-3 space-y-3">
                <li>
                  Account information: when users sign in, Better Focus stores basic account
                  information such as email address through Supabase authentication.
                </li>
                <li>
                  Learning content: questions, answers, generated packs, review outcomes, and
                  related metadata are stored so learning sessions can work across visits.
                </li>
                <li>
                  Blocked site rules: blocked domains and related redirect settings are stored
                  so the extension can determine which visits should be interrupted.
                </li>
                <li>
                  Extension sync data: the Chrome extension stores the configured app URL,
                  blocked domains, and the last sync timestamp locally in the browser.
                </li>
                <li>
                  AI usage data: topic requests, model/provider used, card counts, timestamps,
                  and estimated usage cost may be recorded to enforce plan limits and help
                  users review usage.
                </li>
                {showByok ? (
                  <li>
                    BYOK data: if a user chooses bring-your-own-key, the provider key is stored
                    in encrypted form on the user account and is used only to send AI generation
                    requests through the selected provider.
                  </li>
                ) : null}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                How the Chrome extension works
              </h2>
              <p className="mt-3">
                The Better Focus Chrome extension checks visited page URLs against the user’s
                blocked-site rules. If a visited hostname matches a saved rule, the extension
                redirects that tab to the Better Focus interrupt page. The extension does not
                inject remote code and does not read page content for any purpose other than
                handling redirect logic.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                How information is used
              </h2>
              <ul className="mt-3 space-y-3">
                <li>To authenticate users and maintain signed-in sessions.</li>
                <li>To save blocked-site rules, learning cards, and review progress.</li>
                <li>To redirect blocked visits into learning sessions.</li>
                <li>
                  To generate learning cards through hosted AI models
                  {showByok ? ' or a user-supplied key.' : '.'}
                </li>
                <li>To show plan usage, enforce plan limits, and troubleshoot product issues.</li>
              </ul>
            </section>

            {showByok ? (
              <section>
                <h2 className="text-xl font-bold text-ink dark:text-white">
                  AI providers and BYOK
                </h2>
                <p className="mt-3">
                  Better Focus can generate cards using platform-provided AI access or a
                  user-supplied provider key. When AI generation is used, the topic prompt and
                  generation request are sent to the selected provider. If a user enables BYOK,
                  the cost of those AI requests is billed by that external provider according to
                  that provider’s terms.
                </p>
              </section>
            ) : null}

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                Third-party services
              </h2>
              <p className="mt-3">
                Better Focus currently relies on services including Supabase for
                authentication, database storage, and edge functions, Vercel for web hosting,
                and AI providers such as OpenAI or OpenRouter when card generation is used.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                Data storage and security
              </h2>
              <p className="mt-3">
                Better Focus uses reasonable technical measures to protect stored data.
                {showByok ? ' BYOK credentials are stored in encrypted form.' : ''}
                {' '}No method of transmission or storage is perfectly secure, and security
                cannot be guaranteed absolutely.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">
                User choices
              </h2>
              <ul className="mt-3 space-y-3">
                <li>Users can edit or delete blocked-site rules and learning cards.</li>
                {showByok ? <li>Users can clear a saved BYOK credential from their account.</li> : null}
                <li>Users can sign out of the app at any time.</li>
                <li>
                  Users can remove or disable the Chrome extension through Chrome’s extension
                  settings.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink dark:text-white">Contact</h2>
              <p className="mt-3">
                For privacy-related questions about Better Focus, contact MBrock29 via{' '}
                <a
                  href="https://x.com/MBrock29"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-reef transition hover:underline"
                >
                  X
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10">
            <Link to="/" className="ghost-button">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
