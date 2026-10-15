import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { useAuth } from '../features/auth/useAuth'
import {
  deleteLearningSource,
  generateGroundedCards,
  ingestLearningSource,
  listLearningSources,
  type GroundedGenerationResult,
  type LearningSource,
} from '../features/sources/sourceRepository'
import { AiCardFeedback } from '../features/feedback/AiCardFeedback'
import { trackProductEvent } from '../features/product/productExperience'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

export function SourcesPage() {
  const { user, mode } = useAuth()
  const { settings } = useAiAccess()
  const [sources, setSources] = useState<LearningSource[]>([])
  const [selected, setSelected] = useState('')
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] =
    useState<LearningSource['sourceType']>('text')
  const [sourceUrl, setSourceUrl] = useState('')
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('')
  const [cardCount, setCardCount] = useState(5)
  const [result, setResult] = useState<GroundedGenerationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const enabled = mode === 'supabase' && settings.planTier === 'premium'
  const reload = useCallback(async () => {
    if (user && mode === 'supabase')
      setSources(await listLearningSources(user.id))
  }, [mode, user])
  useEffect(() => {
    void reload().catch(() => setError('Unable to load learning sources.'))
  }, [reload])

  async function readTextFile(file: File | undefined) {
    if (!file) return
    if (file.size > 120_000) {
      setError('Choose a text file smaller than 120 KB.')
      return
    }
    setError(null)
    try {
      if (!/\.(txt|md|markdown|csv|json)$/i.test(file.name))
        throw new Error(
          'Choose a TXT, Markdown, CSV or JSON file. For a PDF, paste the extracted text instead.',
        )
      setContent(await file.text())
      setSourceType('document')
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to read that file. You can paste the text below instead.',
      )
    }
  }

  async function ingest(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await ingestLearningSource({
        title,
        sourceType,
        sourceUrl: sourceUrl || null,
        content,
      })
      await reload()
      setSelected(response.source.id)
      setContent('')
      setTitle('')
      setSourceUrl('')
      setNotice(
        response.reused
          ? 'This material is already in your library and ready to use.'
          : 'Your material is ready. Choose a topic to turn it into questions.',
      )
      if (user)
        void trackProductEvent(user.id, 'source_created', {
          sourceType,
          reused: response.reused,
        })
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Unable to index source.')
    } finally {
      setBusy(false)
    }
  }
  async function generate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    setResult(null)
    try {
      const next = await generateGroundedCards({
        sourceId: selected,
        topic,
        cardCount,
      })
      setResult(next)
      setNotice(`${next.cards.length} cited cards were saved to your library.`)
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to generate grounded cards.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function remove(sourceId: string) {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await deleteLearningSource(user.id, sourceId)
      if (selected === sourceId) setSelected('')
      await reload()
    } catch {
      setError('Unable to delete that source.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-6">
      <div className="page-heading">
        <div>
          <Link to="/app/cards" className="text-link text-xs">
            Back to my learning
          </Link>
          <p className="section-kicker mt-6">Your material</p>
          <h1 className="page-title mt-2">Make your notes stick.</h1>
          <p className="muted-copy mt-3 max-w-2xl text-sm leading-7">
            Paste your notes or upload a text document. Turn the things you
            actually need to learn into short questions, with excerpts you can
            check.
          </p>
        </div>
      </div>
      {!enabled ? (
        <div className="panel p-7">
          <span className="feature-icon">
            <Icon name="book" />
          </span>
          <h2 className="mt-4 text-xl font-bold">
            Your material, made into useful practice.
          </h2>
          <p className="muted-copy mt-3 max-w-2xl text-sm leading-7">
            {mode === 'demo'
              ? 'This local preview cannot process documents. Your connected account can turn pasted notes or a text file into questions grounded in your own material.'
              : 'Learn from your notes with Better Focus Pro. Your questions include source excerpts so you can check where an answer came from.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {mode !== 'demo' ? (
              <Link to="/app/pricing" className="action-button">
                Explore Better Focus Pro
                <Icon name="arrow" />
              </Link>
            ) : null}
            <Link to="/app/cards" className="ghost-button">
              Use a starter set instead
            </Link>
          </div>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="panel border border-red-300 px-6 py-5 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="panel px-6 py-5 text-sm">
          {notice}
        </div>
      ) : null}
      {enabled ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={ingest} className="panel space-y-4 px-6 py-6 sm:px-8">
            <p className="section-kicker">1. Add material</p>
            <label className="block text-sm font-semibold">
              Upload a text document
              <span className="muted-copy mt-1 block text-xs font-normal">
                TXT, Markdown, CSV or JSON, up to 120 KB.
              </span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                onChange={(event) => void readTextFile(event.target.files?.[0])}
                className="mt-2 block w-full text-sm"
              />
            </label>
            <div className="muted-copy text-center text-xs font-semibold uppercase tracking-[0.18em]">
              or paste it below
            </div>
            <label className="block text-sm font-semibold">
              Title
              <input
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3"
              />
            </label>
            <details>
              <summary className="text-sm font-semibold text-reef">
                Add an original source link (optional)
              </summary>
              <label className="mt-3 block text-sm">
                Source link
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  className="app-input mt-2"
                />
              </label>
              <p className="muted-copy mt-2 text-xs">
                Saved as a reference. Paste the actual content below; Better
                Focus does not fetch the link.
              </p>
            </details>
            <label className="block text-sm font-semibold">
              Your notes or text
              <textarea
                required
                maxLength={120000}
                rows={12}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="app-input mt-2"
              />
            </label>
            <button disabled={busy} className="action-button h-11 px-5 text-sm">
              {busy ? 'Preparing…' : 'Add to Better Focus'}
            </button>
          </form>
          <form
            onSubmit={generate}
            className="panel space-y-4 px-6 py-6 sm:px-8"
          >
            <p className="section-kicker">2. Create cited questions</p>
            <label className="block text-sm font-semibold">
              Your material
              <select
                required
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="app-input mt-2"
              >
                <option value="">Choose your material</option>
                {sources
                  .filter((source) => source.status === 'ready')
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Learning topic
              <input
                required
                maxLength={500}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3"
              />
            </label>
            <label className="block text-sm font-semibold">
              Card count
              <input
                type="number"
                min={1}
                max={20}
                value={cardCount}
                onChange={(event) => setCardCount(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3"
              />
            </label>
            <button
              disabled={busy || !selected}
              className="action-button h-11 px-5 text-sm"
            >
              {busy ? 'Preparing questions…' : 'Create my learning questions'}
            </button>
            <div className="mt-6 space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="soft-card flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span>
                    {source.title} · {source.status}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(source.id)}
                    className="ghost-button px-3 py-2 text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </form>
        </div>
      ) : null}
      {result ? (
        <div className="space-y-4">
          <div className="panel px-6 py-5">
            <p className="font-semibold">
              Created from {result.retrieval.sourceTitle}
            </p>
            <details className="muted-copy mt-2 text-xs">
              <summary className="cursor-pointer">
                Technical citation check
              </summary>
              <p className="mt-2">
                {result.retrieval.retrievedChunkCount} passages considered ·
                lexical support check {result.meta.groundingPassRate}%. This
                check does not prove factual correctness.
              </p>
            </details>
          </div>
          {result.cards.map((card) => (
            <article key={card.id} className="panel px-6 py-6">
              <h3 className="text-lg font-bold">{card.question}</h3>
              <p className="mt-4 text-sm leading-7">{card.answer}</p>
              <details className="mt-5">
                <summary className="text-sm font-semibold text-reef">
                  Check the source
                </summary>
                <div className="mt-3 space-y-3">
                  {card.citations.map((citation) => (
                    <div
                      key={citation.chunkId}
                      className="soft-card p-4 text-sm"
                    >
                      <strong>
                        {citation.sourceTitle} · excerpt{' '}
                        {citation.chunkIndex + 1}
                      </strong>
                      <p className="muted-copy mt-2 leading-6">
                        {citation.excerpt}
                        {citation.excerpt.length === 320 ? '…' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
              <AiCardFeedback cardId={card.id} sourceId={card.sourceId} />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
