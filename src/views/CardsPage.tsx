import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TIER_POLICIES } from '../features/ai-access/constants'
import { useAiAccess } from '../features/ai-access/useAiAccess'
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
      <h3 className="text-lg font-bold text-ink dark:text-white">{heading}</h3>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Question</span>
        <textarea
          value={draft.question}
          onChange={(event) => onChange({ ...draft, question: event.target.value })}
          rows={4}
          className="app-input"
          placeholder="What is the difference between useEffect and useLayoutEffect?"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Answer</span>
        <textarea
          value={draft.answer}
          onChange={(event) => onChange({ ...draft, answer: event.target.value })}
          rows={5}
          className="app-input"
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
    <article className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-5 py-5">
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
          <div className="text-lg font-bold text-ink dark:text-white">{card.question}</div>
          <p className="muted-copy mt-3 whitespace-pre-wrap text-sm leading-6">
            {card.answer}
          </p>
          <ReviewStats card={card} />
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
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
  const { localByokCredentials, refresh: refreshAiAccess, settings, tierPolicy } = useAiAccess()
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
  const aiCardLimit = tierPolicy.maxCardsPerPack

  useEffect(() => {
    setAiDraft((current) => ({
      ...current,
      cardCount: Math.max(1, Math.min(aiCardLimit, current.cardCount)),
    }))
  }, [aiCardLimit])

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
      if (settings.planTier === 'byok' && !localByokCredentials?.apiKey) {
        throw new Error('Add your own API key on the pricing page before using BYOK mode.')
      }

      const generation = await generateCardsWithAi({
        topic: aiDraft.topic.trim(),
        cardCount: aiDraft.cardCount,
        requestedModel: settings.planTier === 'byok' ? settings.preferredModel : null,
        byokProvider: settings.planTier === 'byok' ? settings.byokProvider : null,
        byokApiKey: settings.planTier === 'byok' ? localByokCredentials?.apiKey ?? null : null,
      })

      await addGeneratedCards(
        generation.cards.map((card) => ({
          question: card.question,
          answer: card.answer,
          source: 'ai',
          generationTopic: aiDraft.topic.trim(),
          isUserEdited: false,
        })),
      )

      await refreshAiAccess()
      setAiSuccess(
        `Generated ${generation.cards.length} cards with ${generation.meta.model}. ${
          generation.meta.monthlyPackLimit != null
            ? `${generation.meta.monthlyPacksUsed}/${generation.meta.monthlyPackLimit} packs used this month.`
            : 'This request used your own key.'
        }`,
      )
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
        <p className="section-kicker">Learning cards</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink dark:text-white">
          Build a library you will actually want to revisit
        </h2>
        <p className="muted-copy mt-4 max-w-xl">
          Add short questions and answers you want to keep fresh. These cards power
          your learning sessions whenever you choose to review or get redirected here.
        </p>
        <div className="soft-card mt-4 p-5 text-sm leading-6 muted-copy">
          Archive cards you want to keep without showing them in active sessions.
          Delete cards you no longer need at all.
        </div>
        <div className="mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5 text-sm leading-6 muted-copy">
          <div className="font-semibold text-ink dark:text-white">
            Current AI plan: {TIER_POLICIES[settings.planTier].label}
          </div>
          <div className="mt-1">
            {settings.planTier === 'byok'
              ? `Using ${settings.preferredModel} through ${settings.byokProvider}.`
              : `${tierPolicy.maxCardsPerPack} cards per pack, ${
                  tierPolicy.monthlyPackLimit ?? 'unlimited'
                } packs per month.`}
          </div>
          <Link to="/app/pricing" className="mt-3 inline-block font-semibold text-reef">
            Manage plans and BYOK
          </Link>
        </div>

        {formError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {formError}
          </div>
        ) : null}

        <CardEditor
          draft={draft}
          heading="Add a card"
          isPending={pending}
          onChange={setDraft}
          onSubmit={handleCreate}
        />

        <button type="button" className="ghost-button mt-6" onClick={() => void handlePreviewNextCard()}>
          Preview your next card
        </button>

        {nextCardLabel ? (
          <div className="soft-card mt-4 p-5 text-sm text-slate-700 dark:text-slate-200">
            {nextCardLabel}
          </div>
        ) : null}

        <form className="soft-card mt-10 space-y-4 border p-5" onSubmit={handleGenerateCards}>
          <div>
            <p className="section-kicker">AI generate</p>
            <h3 className="mt-2 text-lg font-bold text-ink dark:text-white">Generate a batch from a topic</h3>
            <p className="muted-copy mt-2 text-sm leading-6">
              Enter a topic like “mid-senior React interview questions” and the app
              will create a saved set of cards you can review like any other item in
              your library.
            </p>
            <p className="muted-copy mt-2 text-sm leading-6">
              This plan supports up to {aiCardLimit} cards per pack.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Topic</span>
            <input
              value={aiDraft.topic}
              onChange={(event) => setAiDraft({ ...aiDraft, topic: event.target.value })}
              type="text"
              placeholder="mid-senior React interview questions"
              className="app-input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-1">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Card count (max {aiCardLimit})
              </span>
              <input
                value={aiDraft.cardCount}
                onChange={(event) =>
                  setAiDraft({
                    ...aiDraft,
                    cardCount: Math.max(1, Math.min(aiCardLimit, Number(event.target.value) || 1)),
                  })
                }
                type="number"
                min={1}
                max={aiCardLimit}
                className="app-input"
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
            <p className="section-kicker">Card library</p>
            <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-white">
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
          <div className="soft-card mt-6 px-4 py-8 text-center text-sm muted-copy">
            Loading your cards…
          </div>
        ) : null}

        {!isLoading && cards.length === 0 ? (
          <div className="soft-card mt-6 border-dashed px-5 py-8 text-sm muted-copy">
            No cards yet. Add your first card or generate a topic-based batch so your
            next learning session has something useful to show.
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
