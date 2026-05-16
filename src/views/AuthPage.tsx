import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useTheme } from '../features/theme/ThemeContext'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authError, signInWithGoogle, signInWithPassword, status } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const redirect = searchParams.get('redirect') ?? '/app'

  if (status === 'authenticated') {
    return <Navigate to={redirect} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await signInWithPassword(email, password)
      navigate(redirect)
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to sign in right now.'
      setError(message)
    } finally {
      setPending(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setPending(true)

    try {
      await signInWithGoogle()
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to start Google sign-in.'
      setError(message)
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl justify-end pb-4">
        <button type="button" onClick={toggleTheme} className="theme-toggle">
          <span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
          <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
        </button>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center">
        <div className="grid w-full gap-6 xl:grid-cols-[1.35fr_0.72fr]">
          <section className="editorial-stage px-7 py-8 sm:px-10 sm:py-10">
            <div className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <div>
                <span className="accent-label">Chrome-first focus system</span>
                <p className="mt-4 text-xl font-extrabold uppercase tracking-[0.28em] text-reef/75 sm:text-2xl">
                  Stop Procrastinating
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-[-0.04em] text-ink dark:text-white sm:text-5xl xl:text-6xl">
                  Turn your next distraction into a clean learning rep.
                </h1>
                <p className="muted-copy mt-6 max-w-2xl text-base leading-8 sm:text-lg">
                  Pair a Chrome extension with your own learning cards so every impulse visit becomes a short, useful learning moment instead of a lost scroll.
                </p>

                <div className="stat-ribbon mt-8">
                  <div className="stat-ribbon-item">
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Redirect habit
                    </div>
                    <div className="text-lg font-bold text-ink dark:text-white">
                      Block the sites that pull you off track
                    </div>
                  </div>
                  <div className="stat-ribbon-item">
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Learn quickly
                    </div>
                    <div className="text-lg font-bold text-ink dark:text-white">
                      Review one focused question at a time
                    </div>
                  </div>
                  <div className="stat-ribbon-item">
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Improve recall
                    </div>
                    <div className="text-lg font-bold text-ink dark:text-white">
                      Let weaker cards rise to the top
                    </div>
                  </div>
                </div>
              </div>

              <div className="flow-board">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.24em] text-reef/75">
                      How it works
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink dark:text-white">
                      A learning loop instead of a habit loop
                    </h2>
                  </div>
                  <div className="hidden rounded-full bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-500 sm:block dark:bg-white/5 dark:text-slate-300">
                    5 steps
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flow-step" data-step="1">
                    <div className="text-base font-bold text-ink dark:text-white">
                      Add cards to your account manually or generated by AI.
                    </div>
                  </div>
                  <div className="flow-step" data-step="2">
                    <div className="text-base font-bold text-ink dark:text-white">
                      Add websites you wish to redirect.
                    </div>
                  </div>
                  <div className="flow-step" data-step="3">
                    <div className="text-base font-bold text-ink dark:text-white">
                      Learn from as little as one card per time.
                    </div>
                  </div>
                  <div className="flow-step" data-step="4">
                    <div className="text-base font-bold text-ink dark:text-white">
                      New and shaky cards surface first to prioritise learning.
                    </div>
                  </div>
                  <div className="flow-step" data-step="5">
                    <div className="text-base font-bold text-ink dark:text-white">
                      Cards you&apos;re more confident with stay in the library with lower priority.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="surface-strip px-6 py-8 sm:px-8">
            <div className="mx-auto max-w-md">
              <span className="accent-label">Sign in</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink dark:text-white">
                Start your focus space
              </h2>
              <p className="muted-copy mt-3 text-sm leading-6">
                Sign in to sync blocked sites, save your card packs, and keep your learning setup moving across sessions.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="app-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Password
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="app-input"
                  />
                </label>
                {error ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                  </div>
                ) : null}
                {authError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    {authError}
                  </div>
                ) : null}
                <button type="submit" className="action-button mt-2 w-full">
                  {pending ? 'Signing in…' : 'Continue'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="google-button mt-4 w-full"
                disabled={pending}
              >
                Continue with Google
              </button>

              <div className="spotlight-band mt-6">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                  Why it works
                </div>
                <p className="mt-3 text-sm leading-6 text-ink dark:text-white">
                  The app does not ask for a full study session. It just steals back one moment, then lets consistency do the rest.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
