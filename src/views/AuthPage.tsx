import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { usePricingCurrency } from '../features/pricing/usePricingCurrency'
import { chromeStoreUrl, PUBLIC_PLANS } from '../features/product/publicPlans'
import { BrandMark, Icon } from '../ui/Icon'
import { SiteFooter } from '../ui/SiteFooter'

const signup = '/login?mode=register&redirect=/app/onboarding'
const screenshots = [
  {
    image: '/screenshots/learning-library.png',
    title: 'Choose what you want to learn.',
    caption:
      'Start with a personal goal or a ready-made set. Preview the questions before you add them.',
    alt: 'The Better Focus learning library showing a French learning set and its practice button.',
  },
  {
    image: '/screenshots/distractions.png',
    title: 'Pick the sites that steal your attention.',
    caption:
      'Protection is on all day, every day by default. Add a schedule, snooze a site, or take a break whenever you need.',
    alt: 'The Better Focus Distractions screen showing Reddit and YouTube protected every day, all day.',
  },
]

export function AuthPage() {
  const { status } = useAuth()
  const { prices } = usePricingCurrency()
  const [annual, setAnnual] = useState(false)
  if (status === 'authenticated') return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 text-base font-extrabold"
        >
          <BrandMark />
          Better Focus
        </Link>
        <nav
          className="flex items-center gap-5 text-sm"
          aria-label="Public navigation"
        >
          <a href="#inside-the-app" className="hidden muted-copy sm:block">
            See the app
          </a>
          <a href="#pricing" className="hidden muted-copy sm:block">
            Pricing
          </a>
          <Link to="/login" className="text-sm font-semibold">
            Sign in
          </Link>
          <Link to={signup} className="action-button">
            Start free
            <Icon name="arrow" />
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pb-16 pt-12 sm:pb-20 sm:pt-20">
          <span className="status-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-reef" />A better kind
            of browser habit
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            Stop doomscrolling.
            <br />
            <span className="text-reef">Learn something instead.</span>
          </h1>
          <p className="muted-copy mt-6 max-w-3xl text-base leading-8 sm:text-lg">
            That automatic visit to Reddit? Make it a little French. Another
            trip to YouTube? A question for your next exam. Turn the impulse
            into something useful.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={chromeStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="action-button px-6 py-3.5"
            >
              Add to Chrome — Free
              <Icon name="arrow" />
            </a>
            <a href="#inside-the-app" className="ghost-button px-6 py-3.5">
              See how it works
              <Icon name="arrow" />
            </a>
          </div>
          <p className="mt-4 text-xs muted-copy">
            Your interests. About 30 seconds. Always your choice to continue.
          </p>
        </section>

        <section
          id="inside-the-app"
          className="scroll-mt-6 border-t border-[var(--app-border)] py-12 sm:py-16"
          aria-labelledby="app-preview-title"
        >
          <div className="max-w-2xl">
            <p className="section-kicker">A look inside</p>
            <h2
              id="app-preview-title"
              className="mt-3 text-3xl font-bold tracking-tight"
            >
              Here is what a better habit looks like.
            </h2>
            <p className="muted-copy mt-4 text-sm leading-7">
              Real screens from Better Focus, shown with example learning
              material. See the whole idea before you create an account.
            </p>
          </div>
          <figure className="panel mt-8 overflow-hidden">
            <a
              href="/screenshots/learning-pause.png"
              target="_blank"
              rel="noreferrer"
              aria-label="Open full-size screenshot of a Better Focus learning pause"
              className="block bg-[var(--app-surface-muted)]"
            >
              <img
                src="/screenshots/learning-pause.png"
                alt="A Better Focus interruption showing a French question, its revealed answer, confidence choices and a Continue anyway option."
                width={1440}
                height={960}
                decoding="async"
                className="h-auto w-full"
              />
            </a>
            <figcaption className="border-t border-[var(--app-border)] p-5 sm:p-7">
              <span className="section-kicker">
                The moment that makes the difference
              </span>
              <h3 className="mt-2 text-xl font-bold">
                A distracting visit becomes one useful question.
              </h3>
              <p className="muted-copy mt-2 max-w-3xl text-sm leading-7">
                Think of an answer, reveal it, and say how well you remembered.
                Then continue to the site or get back to your day. Difficult
                questions come back sooner.
              </p>
            </figcaption>
          </figure>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            {screenshots.map((screenshot) => (
              <figure key={screenshot.image} className="panel overflow-hidden">
                <a
                  href={screenshot.image}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-[var(--app-surface-muted)]"
                  aria-label={`Open full-size screenshot: ${screenshot.title}`}
                >
                  <img
                    src={screenshot.image}
                    alt={screenshot.alt}
                    width={1440}
                    height={960}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full"
                  />
                </a>
                <figcaption className="border-t border-[var(--app-border)] p-5 sm:p-6">
                  <h3 className="text-lg font-bold">{screenshot.title}</h3>
                  <p className="muted-copy mt-2 text-sm leading-7">
                    {screenshot.caption}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs muted-copy">
            Select any screenshot to take a closer look.
          </p>
        </section>

        <section
          id="how-it-works"
          className="border-t border-[var(--app-border)] py-16"
        >
          <div className="max-w-xl">
            <p className="section-kicker">Fits into the day you already have</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              No new routine to keep up with.
            </h2>
            <p className="muted-copy mt-4 text-sm leading-7">
              Pick your distractions. Choose what interests you. Let those
              everyday moments do a little more.
            </p>
          </div>
          <div className="mt-9 grid gap-8 md:grid-cols-3">
            {[
              [
                'shield',
                '01',
                'Choose your distractions',
                'Reddit, YouTube, news, social feeds. Protection starts all day, every day, with optional schedules when you want them.',
              ],
              [
                'book',
                '02',
                'Make it something you care about',
                'French for a holiday, cloud concepts for an interview, or notes for your next exam. Start with your own goal.',
              ],
              [
                'spark',
                '03',
                'Learn a little. Decide consciously.',
                'When you open a selected site, take a short question first. Then carry on or get back to your day.',
              ],
            ].map(([icon, number, title, copy]) => (
              <article key={number}>
                <div className="flex items-center gap-3">
                  <span className="feature-icon">
                    <Icon name={icon as 'shield' | 'book' | 'spark'} />
                  </span>
                  <span className="text-xs muted-copy">{number}</span>
                </div>
                <h3 className="mt-5 text-base font-bold">{title}</h3>
                <p className="muted-copy mt-3 text-sm leading-7">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 py-10 md:grid-cols-2">
          <article className="rounded-2xl bg-[#e8eedf] p-7 sm:p-9 dark:bg-[#22382b]">
            <span className="feature-icon bg-[var(--app-surface)]">
              <Icon name="book" />
            </span>
            <p className="section-kicker mt-6">Your material, made memorable</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Learn what matters to you.
            </h2>
            <p className="mt-4 text-sm leading-7 muted-copy">
              Paste your notes or upload a text document. Create questions with
              source excerpts, so a short pause helps with something real.
            </p>
            <p className="mt-5 text-xs font-semibold text-reef">
              Personal material is included with Better Focus Pro.
            </p>
          </article>
          <article className="panel p-7 sm:p-9">
            <span className="feature-icon">
              <Icon name="spark" />
            </span>
            <p className="section-kicker mt-6">Less effort, better practice</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Familiar things get space.
              <br />
              Tricky things come back.
            </h2>
            <p className="mt-4 text-sm leading-7 muted-copy">
              Your review ratings shape when questions return. Need a direction?
              A study guide can look at your recent practice and suggest what
              deserves another look.
            </p>
            <p className="mt-5 text-xs font-semibold text-reef">
              No streak pressure. No leaderboards. Just useful progress.
            </p>
          </article>
        </section>

        <section id="pricing" className="py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="section-kicker">
                Start small. Keep the good habit.
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Free to find your rhythm.
              </h2>
            </div>
            <div className="soft-card inline-flex p-1">
              <button
                aria-pressed={!annual}
                className={`rounded-lg px-4 py-2 text-sm ${!annual ? 'bg-[var(--app-surface)] font-bold' : 'muted-copy'}`}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                aria-pressed={annual}
                className={`rounded-lg px-4 py-2 text-sm ${annual ? 'bg-[var(--app-surface)] font-bold' : 'muted-copy'}`}
                onClick={() => setAnnual(true)}
              >
                Annual
              </button>
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              {
                ...PUBLIC_PLANS.free,
                price: prices.freeMonthly,
                suffix: '/month',
                paid: false,
              },
              {
                ...PUBLIC_PLANS.paid,
                price: annual ? prices.premiumAnnual : prices.premiumMonthly,
                suffix: annual ? '/year' : '/month',
                paid: true,
              },
            ].map((plan) => (
              <article
                key={plan.name}
                className={`panel flex flex-col p-7 sm:p-8 ${plan.paid ? 'border-reef/50' : ''}`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="muted-copy mt-2 text-sm leading-6">
                  {plan.description}
                </p>
                <div className="my-6">
                  <strong className="text-4xl font-extrabold">
                    {plan.price}
                  </strong>
                  <span className="muted-copy ml-2 text-sm">{plan.suffix}</span>
                </div>
                <ul className="flex-1 space-y-3">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-3 text-sm leading-6">
                      <Icon
                        name="check"
                        className="h-4 w-4 shrink-0 text-reef"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Link
                  to={signup}
                  className={`${plan.paid ? 'action-button' : 'ghost-button'} mt-7`}
                >
                  {plan.paid ? 'Start free, upgrade when ready' : 'Start free'}
                  <Icon name="arrow" />
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs muted-copy">
            No card needed to start free. Paid plans have monthly generation
            allowances. Manage cancellation from Settings.
          </p>
        </section>

        <section className="mx-auto max-w-3xl border-t border-[var(--app-border)] py-16">
          <p className="section-kicker">A few things you might be wondering</p>
          <h2 className="mt-3 text-3xl font-bold">Good questions.</h2>
          <div className="mt-6 divide-y divide-[var(--app-border)]">
            {[
              [
                'Can I still open the distracting site?',
                'Yes. Every pause has a clear continuation option. One-question mode is the default; stronger modes are optional. You can also snooze or pause a site.',
              ],
              [
                'Do I need to want to learn programming?',
                'No. Choose a language, a school subject, professional skills, or your own topic. The starter builder follows your goal and experience level.',
              ],
              [
                'When are my sites protected?',
                'New sites are protected all day, every day. You can choose particular days or hours, snooze a site, or pause protection from Distractions.',
              ],
              [
                'Does it work on my phone?',
                'Better Focus currently works through the Chrome desktop extension and the web app. It does not block phone apps or promise whole-device protection.',
              ],
              [
                'Can I use my own notes or PDFs?',
                'You can paste text or upload TXT, Markdown, CSV and JSON files with Pro. For PDFs, copy or extract the relevant text first; direct PDF import is not available yet.',
              ],
            ].map(([question, answer]) => (
              <details key={question} className="py-5">
                <summary className="font-semibold">{question}</summary>
                <p className="muted-copy mt-3 text-sm leading-7">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter className="mx-auto max-w-6xl px-5 sm:px-8" />
    </div>
  )
}
