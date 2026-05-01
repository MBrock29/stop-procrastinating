import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { mode, signInWithGoogle, signInWithPassword, status } = useAuth()
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
                {mode === 'supabase'
                  ? 'Use your Supabase-backed account to sync sites, cards, and redirect sessions.'
                  : 'Supabase keys are not configured yet, so this screen runs in demo mode while keeping the same protected flow.'}
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    name="email"
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
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
                  />
                </label>
                {error ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                  </div>
                ) : null}
                <button type="submit" className="action-button w-full">
                  {pending ? 'Signing in…' : 'Continue'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="ghost-button mt-4 w-full"
                disabled={pending}
              >
                Continue with Google
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
