import type { FormEvent } from 'react'
import { useState } from 'react'
import { generateCardsWithAi } from '../features/cards/aiGenerator'
import { useLearningCards } from '../features/cards/useLearningCards'
import type { LearningCard } from '../types/domain'

interface CardDraft {
  question: string
  answer: string
}

const initialDraft: CardDraft = {
  question: '',
  answer: '',
}

interface AiDraft {
  topic: string
  cardCount: number
}

const initialAiDraft: AiDraft = {
  topic: '',
  cardCount: 10,
}

function CardEditor({
  draft,
  heading,
  isPending,
  onChange,
  onSubmit,
}: {
  draft: CardDraft
  heading: string
  isPending: boolean
  onChange: (draft: CardDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <h3 className="text-lg font-bold text-ink">{heading}</h3>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">Question</span>
        <textarea
          value={draft.question}
          onChange={(event) => onChange({ ...draft, question: event.target.value })}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
          placeholder="What is the difference between useEffect and useLayoutEffect?"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">Answer</span>
        <textarea
          value={draft.answer}
          onChange={(event) => onChange({ ...draft, answer: event.target.value })}
          rows={5}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
          placeholder="useLayoutEffect runs synchronously after DOM mutations but before paint..."
        />
      </label>
      <button type="submit" className="action-button" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save card'}
      </button>
    </form>
  )
}

function ReviewStats({ card }: { card: LearningCard }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
        Know {card.knowCount}
      </span>
      <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">
        Semi {card.semiCount}
      </span>
      <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-700">
        Not confident {card.notConfidentCount}
      </span>
    </div>
  )
}

function CardListItem({
  card,
  isPending,
  onArchive,
  onDelete,
  onUpdate,
}: {
  card: LearningCard
  isPending: boolean
  onArchive: (cardId: string, nextArchivedState: boolean) => Promise<unknown>
  onDelete: (cardId: string) => Promise<unknown>
  onUpdate: (cardId: string, draft: CardDraft) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [localDraft, setLocalDraft] = useState<CardDraft>({
    question: card.question,
    answer: card.answer,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onUpdate(card.id, localDraft)
    setEditing(false)
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
      {editing ? (
        <CardEditor
          draft={localDraft}
          heading="Edit card"
          isPending={isPending}
          onChange={setLocalDraft}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          <div className="text-lg font-bold text-ink">{card.question}</div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {card.answer}
          </p>
          <ReviewStats card={card} />
          <div className="mt-3 text-sm text-slate-500">
            {card.isArchived
              ? 'Archived: hidden from learning sessions, but still saved here.'
              : card.nextReviewAt
                ? `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`
                : 'Active in the learning queue'}
          </div>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            setEditing((current) => !current)
            setLocalDraft({
              question: card.question,
              answer: card.answer,
            })
          }}
        >
          {editing ? 'Cancel edit' : 'Edit'}
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => void onArchive(card.id, !card.isArchived)}
        >
          {card.isArchived ? 'Restore' : 'Archive'}
        </button>
        <button
          type="button"
          className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100"
          onClick={() => void onDelete(card.id)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

export function CardsPage() {
  const {
    addGeneratedCards,
    archiveCard,
    cards,
    createCard,
    error,
    getNextCard,
    isLoading,
    removeCard,
    updateCard,
  } = useLearningCards()
  const [draft, setDraft] = useState<CardDraft>(initialDraft)
  const [aiDraft, setAiDraft] = useState<AiDraft>(initialAiDraft)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState<string | null>(null)
  const [nextCardLabel, setNextCardLabel] = useState<string | null>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.question.trim() || !draft.answer.trim()) {
      setFormError('Add both a question and an answer.')
      return
    }

    setPending(true)
    setFormError(null)

    try {
      await createCard({
        question: draft.question.trim(),
        answer: draft.answer.trim(),
      })
      setDraft(initialDraft)
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to create that card.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate(cardId: string, nextDraft: CardDraft) {
    if (!nextDraft.question.trim() || !nextDraft.answer.trim()) {
      setFormError('Add both a question and an answer.')
      return
    }

    setPending(true)
    setFormError(null)

    try {
      await updateCard(cardId, {
        question: nextDraft.question.trim(),
        answer: nextDraft.answer.trim(),
      })
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to update that card.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  async function handlePreviewNextCard() {
    const card = await getNextCard()
    setNextCardLabel(card ? card.question : 'No active cards are available yet.')
  }

  async function handleGenerateCards(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!aiDraft.topic.trim()) {
      setAiError('Add a topic for the generated card set.')
      return
    }

    setPending(true)
    setAiError(null)
    setAiSuccess(null)

    try {
      const generatedCards = await generateCardsWithAi({
        topic: aiDraft.topic.trim(),
        cardCount: aiDraft.cardCount,
      })

      await addGeneratedCards(
        generatedCards.map((card) => ({
          question: card.question,
          answer: card.answer,
          source: 'ai',
          generationTopic: aiDraft.topic.trim(),
          isUserEdited: false,
        })),
      )

      setAiSuccess(`Generated ${generatedCards.length} cards for "${aiDraft.topic.trim()}".`)
      setAiDraft(initialAiDraft)
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to generate cards right now.'
      setAiError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
          Learning cards
        </p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
          Build the prompts that will interrupt your scroll reflex
        </h2>
        <p className="mt-4 max-w-xl text-slate-600">
          Cards are authored manually in v1. Reviews will push strong answers farther
          out and bring shaky ones back sooner.
        </p>
        <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Archiving keeps a card in your library but removes it from active learning sessions.
          Deleting removes it permanently.
        </div>

        {formError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {formError}
          </div>
        ) : null}

        <CardEditor
          draft={draft}
          heading="Add a new card"
          isPending={pending}
          onChange={setDraft}
          onSubmit={handleCreate}
        />

        <button type="button" className="ghost-button mt-6" onClick={() => void handlePreviewNextCard()}>
          Preview next review card
        </button>

        {nextCardLabel ? (
          <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
            {nextCardLabel}
          </div>
        ) : null}

        <form className="mt-10 space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5" onSubmit={handleGenerateCards}>
          <div>
            <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
              AI generate
            </p>
            <h3 className="mt-2 text-lg font-bold text-ink">Create a cheap cached batch once</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter a topic like “mid-senior React interview questions” and the app
              will generate a stored batch that reuses your existing review flow.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Topic</span>
            <input
              value={aiDraft.topic}
              onChange={(event) => setAiDraft({ ...aiDraft, topic: event.target.value })}
              type="text"
              placeholder="mid-senior React interview questions"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-1">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Card count (max 50)
              </span>
              <input
                value={aiDraft.cardCount}
                onChange={(event) =>
                  setAiDraft({
                    ...aiDraft,
                    cardCount: Math.max(1, Math.min(50, Number(event.target.value) || 1)),
                  })
                }
                type="number"
                min={1}
                max={50}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-reef focus:ring-4 focus:ring-reef/10"
              />
            </label>
          </div>

          {aiError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {aiError}
            </div>
          ) : null}

          {aiSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {aiSuccess}
            </div>
          ) : null}

          <button type="submit" className="action-button" disabled={pending}>
            {pending ? 'Generating…' : 'Generate AI cards'}
          </button>
        </form>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-extrabold uppercase tracking-[0.28em] text-reef/75">
              Card library
            </p>
            <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
              {cards.length} card{cards.length === 1 ? '' : 's'} in your library
            </h3>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            Loading your cards…
          </div>
        ) : null}

        {!isLoading && cards.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            No cards yet. Add a question you’d genuinely like to remember so the
            redirect flow has something useful to show.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {cards.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              isPending={pending}
              onArchive={archiveCard}
              onDelete={removeCard}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
