import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseBrowserClient } from '../lib/supabase'
import { env } from '../lib/env'
import { BrandMark } from '../ui/Icon'

export function PasswordRecoveryPage({ update = false }: { update?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const client = getSupabaseBrowserClient()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      if (!client)
        throw new Error(
          'Password recovery is available with a connected account. Local preview does not use a password.',
        )
      if (update) {
        if (form.get('password') !== form.get('confirm'))
          throw new Error('Your passwords do not match.')
        const result = await client.auth.updateUser({
          password: String(form.get('password')),
        })
        if (result.error) throw result.error
        setNotice('Your password has been updated.')
      } else {
        const result = await client.auth.resetPasswordForEmail(
          String(form.get('email')),
          { redirectTo: new URL('/update-password', env.appUrl).toString() },
        )
        if (result.error) throw result.error
        setNotice(
          'If an account exists for that email, you will receive a password reset link.',
        )
      }
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to complete this request. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <Link
        to="/"
        className="mb-8 flex items-center justify-center gap-3 font-extrabold"
      >
        <BrandMark />
        Better Focus
      </Link>
      <section className="panel p-8">
        <h1 className="text-2xl font-bold">
          {update ? 'Choose a new password.' : 'Let’s get you back in.'}
        </h1>
        <p className="mt-3 text-sm leading-6 muted-copy">
          {update
            ? 'Use at least eight characters.'
            : 'We will email a link to reset your password.'}
        </p>
        {notice ? (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </p>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-6 space-y-4"
          >
            {update ? (
              <>
                <label className="block text-sm font-semibold">
                  New password
                  <input
                    className="app-input mt-2"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Confirm password
                  <input
                    className="app-input mt-2"
                    type="password"
                    name="confirm"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block text-sm font-semibold">
                Email
                <input
                  className="app-input mt-2"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            <button disabled={busy || !client} className="action-button w-full">
              {busy
                ? 'Please wait…'
                : update
                  ? 'Save new password'
                  : 'Send reset link'}
            </button>
          </form>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {!client ? (
          <p className="mt-4 text-sm muted-copy">
            Password recovery needs a connected account. Local preview has no
            password.
          </p>
        ) : null}
        <Link
          to={update && notice ? '/app' : '/login'}
          className="text-link mt-5"
        >
          {update && notice ? 'Back to my learning' : 'Back to sign in'}
        </Link>
      </section>
    </main>
  )
}
