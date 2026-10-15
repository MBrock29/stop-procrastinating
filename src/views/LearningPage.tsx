import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLearningCards } from '../features/cards/useLearningCards'
import { StarterSetBuilder } from '../features/product/StarterSetBuilder'
import {
  buildLearningTopics,
  topicPracticeUrl,
} from '../features/product/learningTopics'
import { Icon } from '../ui/Icon'
import { useAiAccess } from '../features/ai-access/useAiAccess'

function ManualQuestionForm({
  onSave,
}: {
  onSave: (input: {
    question: string
    answer: string
    generationTopic: string | null
  }) => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <details className="panel p-6">
      <summary className="font-bold">Write my own question</summary>
      <p className="mt-3 text-sm muted-copy">
        No generation required. Write something you would like to remember.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const data = new FormData(form)
          setBusy(true)
          setError(null)
          setMessage(null)
          void onSave({
            question: String(data.get('question')).trim(),
            answer: String(data.get('answer')).trim(),
            generationTopic: String(data.get('topic')).trim() || null,
          })
            .then(() => {
              setMessage('Your question is saved and ready to practise.')
              form.reset()
            })
            .catch((next) =>
              setError(
                next instanceof Error
                  ? next.message
                  : 'Unable to save your question.',
              ),
            )
            .finally(() => setBusy(false))
        }}
      >
        <label className="block text-sm font-semibold">
          Topic (optional)
          <input className="app-input mt-2" name="topic" maxLength={200} />
        </label>
        <label className="block text-sm font-semibold">
          Question
          <textarea
            required
            className="app-input mt-2"
            name="question"
            maxLength={1000}
            rows={2}
          />
        </label>
        <label className="block text-sm font-semibold">
          Answer
          <textarea
            required
            className="app-input mt-2"
            name="answer"
            maxLength={4000}
            rows={3}
          />
        </label>
        <button disabled={busy} className="action-button">
          {busy ? 'Saving…' : 'Save my question'}
          <Icon name="plus" />
        </button>
      </form>
      {message ? (
        <p role="status" className="mt-4 text-sm text-reef">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </details>
  )
}

export function LearningPage() {
  const { cards, isLoading, error, addGeneratedCards, createCard } =
    useLearningCards()
  const { tierPolicy } = useAiAccess()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const topics = buildLearningTopics(cards)
  const visible = topics.filter((topic) =>
    topic.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-7">
      <div className="page-heading">
        <div>
          <p className="section-kicker">A small habit. Useful knowledge.</p>
          <h1 className="page-title mt-2">My learning.</h1>
          <p className="muted-copy mt-3 text-sm">
            Choose what matters to you. We will bring it back at the right
            moment.
          </p>
        </div>
        <button
          className={adding ? 'ghost-button' : 'action-button'}
          onClick={() => setAdding(!adding)}
        >
          {adding ? (
            'Close builder'
          ) : (
            <>
              <Icon name="plus" />
              New learning set
            </>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-[var(--app-border)] pb-4">
        <span className="text-sm font-semibold">
          {topics.length} topic{topics.length === 1 ? '' : 's'}
        </span>
        <Link to="/app/sources" className="text-link">
          <Icon name="book" />
          Use my own notes
        </Link>
        <Link to="/app/tutor" className="text-link">
          <Icon name="spark" />
          What should I practise?
        </Link>
        <Link to="/app/cards/manage" className="ml-auto text-link">
          Edit questions & summaries
        </Link>
      </div>
      {adding || (!isLoading && !topics.length) ? (
        <section className="panel p-6 sm:p-8">
          <StarterSetBuilder
            existingCards={cards}
            onAdd={addGeneratedCards}
            onComplete={() => setAdding(false)}
          />
        </section>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p role="status" className="muted-copy">
          Loading your learning…
        </p>
      ) : null}
      {topics.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Your learning sets</h2>
            <label className="max-w-sm text-sm">
              <span className="sr-only">Search topics</span>
              <input
                className="app-input"
                placeholder="Find a topic…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((topic, index) => (
              <article key={topic.title} className="panel p-6">
                <div className="flex items-center justify-between">
                  <span
                    className={`feature-icon ${index % 3 === 1 ? 'bg-amber-100 text-amber-800' : ''}`}
                  >
                    <Icon name="book" />
                  </span>
                  <span className="status-pill">
                    {topic.due ? `${topic.due} due` : 'Up to date'}
                  </span>
                </div>
                <h3 className="mt-5 break-words text-lg font-bold">
                  {topic.title}
                </h3>
                <p className="mt-2 text-xs muted-copy">
                  {topic.cards.length} questions ·{' '}
                  {topic.reviews
                    ? `${topic.reviews} reviews`
                    : 'Ready for your first practice'}
                </p>
                <div className="mt-5">
                  <div className="flex justify-between text-xs muted-copy">
                    <span>Review confidence</span>
                    <span>
                      {topic.confidence == null
                        ? 'Not reviewed yet'
                        : `${topic.confidence}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
                    <div
                      className="h-full rounded-full bg-reef"
                      style={{ width: `${topic.confidence ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <Link
                    to={topicPracticeUrl(topic.title)}
                    className="text-link"
                  >
                    Practise
                    <Icon name="arrow" />
                  </Link>
                  <details className="text-xs">
                    <summary className="muted-copy">Questions</summary>
                    <ul className="mt-3 space-y-2">
                      {topic.cards.map((card) => (
                        <li key={card.id}>{card.question}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              </article>
            ))}
          </div>
          {!visible.length ? (
            <p className="empty-state text-sm muted-copy">
              No topics match that search.
            </p>
          ) : null}
          <p className="text-xs muted-copy">
            Confidence reflects your own review ratings. It is a guide to
            practice, rather than a test score.
          </p>
        </>
      ) : null}
      <ManualQuestionForm
        onSave={async (input) => {
          if (!input.question || !input.answer)
            throw new Error('Add both a question and an answer.')
          if (
            tierPolicy.maxStoredCards != null &&
            cards.length >= tierPolicy.maxStoredCards
          )
            throw new Error(
              'Your library is full. Remove some questions or review your plan in Settings.',
            )
          await createCard(input)
        }}
      />
    </div>
  )
}
