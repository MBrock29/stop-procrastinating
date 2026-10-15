import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { getSupabaseBrowserClient } from '../lib/supabase'
import { BrandMark, Icon } from '../ui/Icon'
import { SiteFooter } from '../ui/SiteFooter'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const {
    authError,
    mode,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    status,
  } = useAuth()
  const [register, setRegister] = useState(params.get('mode') === 'register')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const requested = params.get('redirect')
  const redirect =
    requested?.startsWith('/') &&
    !requested.startsWith('//') &&
    !requested.includes('\\')
      ? requested
      : register
        ? '/app/onboarding'
        : '/app'
  if (status === 'authenticated') return <Navigate to={redirect} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const form = new FormData(event.currentTarget)
    try {
      const email = String(form.get('email') ?? '')
      const password = String(form.get('password') ?? '')
      if (register) {
        await signUpWithPassword(email, password)
        const client = getSupabaseBrowserClient()
        if (client && !(await client.auth.getSession()).data.session) {
          setNotice(
            'Check your inbox to confirm your email. The link will bring you back to set up your learning.',
          )
          return
        }
      } else await signInWithPassword(email, password)
      navigate(redirect)
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      <Link to="/" className="mx-auto flex items-center gap-3 font-extrabold">
        <BrandMark />
        Better Focus
      </Link>
      <main className="my-auto py-10">
        <section className="panel p-7 sm:p-9">
          <p className="section-kicker">A little more space for you</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {mode === 'demo'
              ? 'Take a look around.'
              : register
                ? 'Start a better browser habit.'
                : 'Welcome back.'}
          </h1>
          <p className="mt-3 text-sm leading-6 muted-copy">
            {mode === 'demo'
              ? 'This is a local preview. Your learning stays in this browser; no real account is created and no password is needed.'
              : register
                ? 'Choose your distractions. Learn something you care about.'
                : 'Your learning and focus space are right here.'}
          </p>
          {notice ? (
            <p
              role="status"
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {notice}
            </p>
          ) : null}
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => void submit(event)}
          >
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="app-input mt-2"
                placeholder="you@example.com"
              />
            </label>
            {mode !== 'demo' ? (
              <label className="block text-sm font-semibold">
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={register ? 8 : undefined}
                  required
                  className="app-input mt-2"
                />
              </label>
            ) : null}
            {error || authError ? (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
              >
                {error ?? authError}
              </p>
            ) : null}
            <button disabled={busy} className="action-button w-full">
              {busy
                ? 'Opening…'
                : mode === 'demo'
                  ? 'Enter local preview'
                  : register
                    ? 'Create my free account'
                    : 'Sign in'}
              <Icon name="arrow" />
            </button>
          </form>
          {mode !== 'demo' ? (
            <>
              <button
                disabled={busy}
                className="ghost-button mt-3 w-full"
                onClick={() => {
                  setBusy(true)
                  void signInWithGoogle(redirect)
                    .catch((next) =>
                      setError(
                        next instanceof Error
                          ? next.message
                          : 'Unable to start Google sign-in.',
                      ),
                    )
                    .finally(() => setBusy(false))
                }}
              >
                Continue with Google
              </button>
              <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs">
                <button
                  className="font-semibold text-reef"
                  onClick={() => {
                    setRegister(!register)
                    setError(null)
                    setNotice(null)
                  }}
                >
                  {register
                    ? 'Already have an account? Sign in'
                    : 'New here? Create an account'}
                </button>
                {!register ? (
                  <Link to="/forgot-password" className="text-reef">
                    Forgot password?
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}
          <Link to="/" className="mt-6 block text-center text-xs muted-copy">
            Back to Better Focus
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
