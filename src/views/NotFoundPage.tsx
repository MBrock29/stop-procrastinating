import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="panel w-full max-w-xl px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
          Not found
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
          This route wandered off.
        </h1>
        <p className="mt-4 text-slate-600">
          Head back to the app shell and we’ll keep building from there.
        </p>
        <Link to="/" className="action-button mt-6">
          Go home
        </Link>
      </section>
    </div>
  )
}
