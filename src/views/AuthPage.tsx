import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const DEMO_AUTH_KEY = 'stop-procrastinating.demo-auth'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/app'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.localStorage.setItem(DEMO_AUTH_KEY, 'true')
    navigate(redirect)
  }

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel overflow-hidden px-8 py-10 sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-reef/75">
              Focus reclaim
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Redirect distraction into a tiny learning win.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              This app pairs a browser extension with your own question-and-answer
              cards so every impulse visit becomes a short, useful review moment.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'Block habit domains with one rule.',
                'Show one tailored card per redirect.',
                'Track confidence so weaker topics return sooner.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="panel px-6 py-8 sm:px-8">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-bold text-ink">Sign in to your focus space</h2>
              <p className="mt-2 text-sm text-slate-600">
                Supabase auth will plug in here next. For now, this route gives us the
                protected flow and redirect behavior we need.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
                  />
                </label>
                <button type="submit" className="action-button w-full">
                  Continue
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
