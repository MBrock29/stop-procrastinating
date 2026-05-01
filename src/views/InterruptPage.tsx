import { useSearchParams } from 'react-router-dom'

export function InterruptPage() {
  const [searchParams] = useSearchParams()
  const site = searchParams.get('site') ?? 'unknown-site.com'

  return (
    <div className="min-h-screen bg-soft-grid bg-[size:36px_36px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="panel px-6 py-8 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-reef/75">
            Redirect interrupt
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink">
            Pause the habit loop.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The extension tried to open <span className="font-semibold text-ink">{site}</span>.
            This route will become the one-card learning flow.
          </p>
        </section>
      </div>
    </div>
  )
}
