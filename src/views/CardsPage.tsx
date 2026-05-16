import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  draft: { question: string; answer: string }
  heading: string
  isPending: boolean
  onChange: (draft: { question: string; answer: string }) => void
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
          placeholder="What is a variable in programming?"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Answer</span>
        <textarea
          value={draft.answer}
          onChange={(event) => onChange({ ...draft, answer: event.target.value })}
          rows={5}
          className="app-input"
          placeholder="A variable is a named value that can store data for later use in a program."
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
  onUpdate: (cardId: string, draft: { question: string; answer: string }) => Promise<unknown>
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

interface GeneratedPackSummary {
  batchId: string
  topic: string
  count: number
  createdAt: string
  cardIds: string[]
  questions: string[]
}

export function CardsPage() {
  const {
    byokCredentialStatus,
    refresh: refreshAiAccess,
    settings,
    tierPolicy,
    usage,
  } = useAiAccess()
  const {
    addGeneratedCards,
    archiveCard,
    cards,
    error,
    isLoading,
    removeCard,
    removeCards,
    updateCard,
  } = useLearningCards()
  const [aiDraft, setAiDraft] = useState<AiDraft>(initialAiDraft)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState<string | null>(null)
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null)
  const [visibleCardCount, setVisibleCardCount] = useState(10)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const aiCardLimit = tierPolicy.maxCardsPerPack

  const generatedPacks = useMemo<GeneratedPackSummary[]>(() => {
    const packMap = new Map<string, GeneratedPackSummary>()

    cards
      .filter((card) => card.source === 'ai')
      .forEach((card) => {
        const batchId =
          card.generationBatchId ??
          `legacy:${card.generationTopic ?? 'Generated pack'}:${card.createdAt.slice(0, 16)}`
        const existing = packMap.get(batchId)

        if (existing) {
          existing.count += 1
          existing.cardIds.push(card.id)
          existing.questions.push(card.question)
          if (card.createdAt > existing.createdAt) {
            existing.createdAt = card.createdAt
          }
          return
        }

        packMap.set(batchId, {
          batchId,
          topic: card.generationTopic ?? 'Generated pack',
          count: 1,
          createdAt: card.createdAt,
          cardIds: [card.id],
          questions: [card.question],
        })
      })

    return Array.from(packMap.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )
  }, [cards])

  useEffect(() => {
    setAiDraft((current) => ({
      ...current,
      cardCount: Math.max(1, Math.min(aiCardLimit, current.cardCount)),
    }))
  }, [aiCardLimit])

  useEffect(() => {
    setVisibleCardCount(10)
  }, [cards.length])

  useEffect(() => {
    const sentinel = loadMoreRef.current

    if (!sentinel || cards.length <= 10) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries

        if (entry?.isIntersecting) {
          setVisibleCardCount((current) => Math.min(current + 10, cards.length))
        }
      },
      {
        rootMargin: '200px 0px',
      },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [cards.length])

  const visibleCards = useMemo(
    () => cards.slice(0, visibleCardCount),
    [cards, visibleCardCount],
  )

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
      if (settings.planTier === 'byok' && !byokCredentialStatus) {
        throw new Error('Add your own API key on the BYOK page before using BYOK mode.')
      }

      const generationBatchId = crypto.randomUUID()
      const generation = await generateCardsWithAi({
        topic: aiDraft.topic.trim(),
        cardCount: aiDraft.cardCount,
        requestedModel: settings.planTier === 'byok' ? settings.preferredModel : null,
        byokProvider: settings.planTier === 'byok' ? settings.byokProvider : null,
      })

      await addGeneratedCards(
        generation.cards.map((card) => ({
          question: card.question,
          answer: card.answer,
          source: 'ai',
          generationTopic: aiDraft.topic.trim(),
          generationBatchId,
          isUserEdited: false,
        })),
      )

      await refreshAiAccess()
      const nextPacksUsed =
        generation.meta.monthlyPacksUsed > 0
          ? generation.meta.monthlyPacksUsed
          : usage.currentMonthPacksUsed + 1
      setAiSuccess(
        `Generated ${generation.cards.length} cards with ${generation.meta.model}. ${
          generation.meta.monthlyPackLimit != null
            ? `${nextPacksUsed}/${generation.meta.monthlyPackLimit} packs used this month.`
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

  async function handleBulkDelete(cardIds: string[]) {
    if (cardIds.length === 0) {
      return
    }

    setPending(true)
    setFormError(null)

    try {
      await removeCards(cardIds)
      setExpandedPackId((current) => {
        if (!current) {
          return current
        }

        const stillExists = generatedPacks.some((pack) => pack.batchId === current && !pack.cardIds.every((id) => cardIds.includes(id)))
        return stillExists ? current : null
      })
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to delete those cards.'
      setFormError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="panel px-6 py-6 sm:px-8">
        <p className="section-kicker">Learning cards</p>
        <p className="muted-copy mt-4 max-w-xl">
          Add short questions with the generator below. These cards power your
          learning sessions whenever you choose to review or get redirected here.
        </p>
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
            Manage plans
          </Link>
        </div>

        {formError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {formError}
          </div>
        ) : null}

        <form className="soft-card mt-10 space-y-4 border p-5" onSubmit={handleGenerateCards}>
          <div>
            <p className="section-kicker">AI generated packs</p>
            <h3 className="mt-2 text-lg font-bold text-ink dark:text-white">Generate a batch from a topic</h3>
            <p className="muted-copy mt-2 text-sm leading-6">
              Enter a topic such as “Senior level programming interview questions” or
              “Common English-Spanish phrases with translation” and the app will create
              a saved set of cards.
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
              placeholder="Senior level programming interview questions"
              className="app-input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-1">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Card count
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

        <div className="soft-card mt-6 p-5">
          <div>
            <h3 className="text-lg font-bold text-ink dark:text-white">Added packs</h3>
            <p className="muted-copy mt-2 text-sm leading-6">
              Open a pack to see the questions it added, or delete the whole pack from your learning card library.
            </p>
          </div>

          {generatedPacks.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] px-4 py-5 text-sm muted-copy">
              No AI packs yet. Generate a topic-based pack to see it listed here.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {generatedPacks.map((pack) => {
                const isExpanded = expandedPackId === pack.batchId

                return (
                  <div
                    key={pack.batchId}
                    className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() =>
                          setExpandedPackId((current) =>
                            current === pack.batchId ? null : pack.batchId,
                          )
                        }
                      >
                        <div className="text-base font-bold text-ink dark:text-white">
                          {pack.topic} ({pack.count})
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                          Generated {new Date(pack.createdAt).toLocaleString()}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={() => void handleBulkDelete(pack.cardIds)}
                        disabled={pending}
                      >
                        Delete pack
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 border-t border-[var(--app-border)] pt-4">
                        <div className="text-sm font-semibold text-ink dark:text-white">
                          Questions in this pack
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          {pack.questions.map((question) => (
                            <li key={`${pack.batchId}-${question}`} className="rounded-2xl bg-[var(--app-surface-muted)] px-3 py-3">
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Card library</p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-white sm:text-3xl">
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
          {visibleCards.map((card) => (
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

        {!isLoading && visibleCards.length < cards.length ? (
          <div ref={loadMoreRef} className="mt-4 py-4 text-center text-sm text-slate-500 dark:text-slate-300">
            Loading more cards…
          </div>
        ) : null}
      </section>
    </div>
  )
}
