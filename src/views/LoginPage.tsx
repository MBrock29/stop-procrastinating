import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useTheme } from '../features/theme/ThemeContext'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authError, signInWithGoogle, signInWithPassword, signUpWithPassword, status } =
    useAuth()
  const { theme, toggleTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'signin',
  )
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
      if (authMode === 'register') {
        await signUpWithPassword(email, password)
      } else {
        await signInWithPassword(email, password)
      }
      navigate(redirect)
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : authMode === 'register'
            ? 'Unable to create your account right now.'
            : 'Unable to sign in right now.'
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
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between pb-4">
        <Link to="/" className="text-sm font-semibold text-slate-600 transition hover:text-reef dark:text-slate-300">
          ← Back to home
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={theme === 'light' ? 'Enable dark theme' : 'Enable light theme'}
          title={theme === 'light' ? 'Dark theme' : 'Light theme'}
        >
          <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
        </button>
      </div>

      <div className="mx-auto max-w-xl">
        <section className="panel px-6 py-7 sm:px-8">
          <div className="mx-auto max-w-md">
            <div className="flex rounded-full border border-slate-200/70 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin')
                  setError(null)
                }}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === 'signin'
                    ? 'bg-reef text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setError(null)
                }}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === 'register'
                    ? 'bg-reef text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Register
              </button>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-ink dark:text-white">
              {authMode === 'register' ? 'Create your focus space' : 'Sign in to your focus space'}
            </h2>

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
              <button type="submit" className="action-button w-full">
                {pending
                  ? authMode === 'register'
                    ? 'Creating account…'
                    : 'Signing in…'
                  : authMode === 'register'
                    ? 'Create account'
                    : 'Continue'}
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
          </div>
        </section>
      </div>

      <footer className="mx-auto max-w-xl px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Made with love by{' '}
        <a
          href="https://x.com/MBrock29"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-reef transition hover:underline"
        >
          MBrock29
        </a>
      </footer>
    </div>
  )
}
