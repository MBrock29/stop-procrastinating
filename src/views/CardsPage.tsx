import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TIER_POLICIES } from '../features/ai-access/constants'
import { useAiAccess } from '../features/ai-access/useAiAccess'
import { generateLearningBrief } from '../features/briefs/briefGenerator'
import { useLearningBriefs } from '../features/briefs/useLearningBriefs'
import { generateCardsWithAi } from '../features/cards/aiGenerator'
import { useLearningCards } from '../features/cards/useLearningCards'
import type { LearningCard } from '../types/domain'

interface CardDraft {
  question: string
  answer: string
}

interface AiDraft {
  topic: string
  cardCount: string
}

const initialAiDraft: AiDraft = {
  topic: '',
  cardCount: '10',
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

function parsePackDepth(topic: string) {
  if (topic.endsWith(' (deepest learning)')) {
    return {
      baseTopic: topic.slice(0, -' (deepest learning)'.length),
      depth: 2 as const,
    }
  }

  if (topic.endsWith(' (deeper learning)')) {
    return {
      baseTopic: topic.slice(0, -' (deeper learning)'.length),
      depth: 1 as const,
    }
  }

  return {
    baseTopic: topic,
    depth: 0 as const,
  }
}

export function CardsPage() {
  const {
    byokCredentialStatus,
    refresh: refreshAiAccess,
    settings,
    tierPolicy,
    usage,
  } = useAiAccess()
  const { briefs, isLoading: briefsLoading, error: briefsError, addBrief, removeBrief } =
    useLearningBriefs()
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
  const [packActionState, setPackActionState] = useState<{
    packId: string | null
    tone: 'success' | 'error'
    message: string | null
  }>({
    packId: null,
    tone: 'success',
    message: null,
  })
  const [briefsExpanded, setBriefsExpanded] = useState(true)
  const [packsExpanded, setPacksExpanded] = useState(true)
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null)
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null)
  const [visibleCardCount, setVisibleCardCount] = useState(10)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const aiCardLimit = tierPolicy.maxCardsPerPack
  const storageCap = tierPolicy.maxStoredCards
  const showPremiumTools = settings.planTier === 'premium'

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
    setAiDraft((current) => {
      if (!current.cardCount.trim()) {
        return current
      }

      const parsed = Number(current.cardCount)

      if (!Number.isFinite(parsed)) {
        return current
      }

      return {
        ...current,
        cardCount: String(Math.max(1, Math.min(aiCardLimit, parsed))),
      }
    })
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
  const parsedCardCount = Number(aiDraft.cardCount)
  const storedCardsCount = cards.length
  const remainingStorageSlots =
    storageCap == null ? Number.POSITIVE_INFINITY : Math.max(storageCap - storedCardsCount, 0)
  const isCardCountEmpty = aiDraft.cardCount.trim().length === 0
  const hasValidCardCount =
    !isCardCountEmpty &&
    Number.isInteger(parsedCardCount) &&
    parsedCardCount >= 1 &&
    parsedCardCount <= aiCardLimit &&
    parsedCardCount <= remainingStorageSlots
  const cardCountError = isCardCountEmpty
    ? 'Enter how many cards you want to generate.'
    : !Number.isInteger(parsedCardCount)
      ? 'Enter a whole number.'
      : parsedCardCount < 1
        ? 'Card count must be at least 1.'
      : parsedCardCount > aiCardLimit
          ? `Card count cannot be more than ${aiCardLimit} on this plan.`
          : Number.isFinite(remainingStorageSlots) && remainingStorageSlots <= 0
            ? `This plan allows up to ${storageCap} stored cards. Delete cards before generating more.`
            : Number.isFinite(remainingStorageSlots) &&
                parsedCardCount > remainingStorageSlots
              ? `You can only add ${remainingStorageSlots} more card${remainingStorageSlots === 1 ? '' : 's'} before reaching this plan’s ${storageCap}-card limit.`
          : null

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

    if (!hasValidCardCount) {
      setAiError(cardCountError ?? 'Enter a valid card count.')
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
        cardCount: parsedCardCount,
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

  async function handleGenerateBrief(pack: GeneratedPackSummary) {
    if (!showPremiumTools) {
      return
    }

    setPending(true)
    setPackActionState({
      packId: pack.batchId,
      tone: 'success',
      message: null,
    })

    try {
      const generated = await generateLearningBrief({
        topic: pack.topic,
        cards: cards
          .filter((card) => pack.cardIds.includes(card.id))
          .map((card) => ({
            question: card.question,
            answer: card.answer,
          })),
      })

      await addBrief({
        topic: pack.topic,
        title: generated.title,
        content: generated.content,
        kind: 'summary',
      })

      setPackActionState({
        packId: pack.batchId,
        tone: 'success',
        message: `Saved a summary for ${pack.topic} with ${generated.meta.model}.`,
      })
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to generate a learning brief right now.'
      setPackActionState({
        packId: pack.batchId,
        tone: 'error',
        message,
      })
    } finally {
      setPending(false)
    }
  }

  async function handleGoDeeper(pack: GeneratedPackSummary) {
    if (!showPremiumTools) {
      return
    }

    setPending(true)
    setAiError(null)
    setAiSuccess(null)
    setPackActionState({
      packId: pack.batchId,
      tone: 'success',
      message: null,
    })

    try {
      const { baseTopic, depth } = parsePackDepth(pack.topic)
      const relatedPacks = generatedPacks
        .filter((candidate) => parsePackDepth(candidate.topic).baseTopic === baseTopic)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      const originalPack =
        relatedPacks.find((candidate) => parsePackDepth(candidate.topic).depth === 0) ?? pack
      const originalPackCount = originalPack.count
      const currentCards = cards.filter((card) => pack.cardIds.includes(card.id))
      const priorCards =
        depth === 0
          ? currentCards
          : cards.filter((card) =>
              relatedPacks
                .filter((candidate) => parsePackDepth(candidate.topic).depth < depth)
                .some((candidate) => candidate.cardIds.includes(card.id)),
            )
      const studiedDigest = [...priorCards, ...currentCards]
        .map(
          (card, index) =>
            `${index + 1}. Q: ${card.question}\nA: ${card.answer}`,
        )
        .join('\n\n')
      const nextTopic =
        depth === 0
          ? `${baseTopic} (deeper learning)`
          : `${baseTopic} (deepest learning)`
      const targetCardCount =
        depth === 0
          ? Math.min(originalPackCount, 50, aiCardLimit)
          : Math.min(originalPackCount, 25, aiCardLimit)
      const deeperTopic = `These are learning cards the user has already studied for "${baseTopic}". Generate ${targetCardCount} more advanced follow-up cards that build directly on the studied material. The new cards must be noticeably harder than the previous pack, go deeper into trade-offs and edge cases, and assume the learner already understands the earlier questions.\n\nAlready studied cards:\n${studiedDigest}`
      const generationBatchId = crypto.randomUUID()
      const generation = await generateCardsWithAi({
        topic: deeperTopic,
        cardCount: targetCardCount,
      })

      await addGeneratedCards(
        generation.cards.map((card) => ({
          question: card.question,
          answer: card.answer,
          source: 'ai',
          generationTopic: nextTopic,
          generationBatchId,
          isUserEdited: false,
        })),
      )

      await refreshAiAccess()
      setPackActionState({
        packId: pack.batchId,
        tone: 'success',
        message:
          depth === 0
            ? `Generated a deeper learning pack for ${baseTopic}.`
            : `Generated the deepest learning pack for ${baseTopic}.`,
      })
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Unable to generate a deeper pack right now.'
      setPackActionState({
        packId: pack.batchId,
        tone: 'error',
        message,
      })
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
              : settings.planTier === 'premium'
                ? '100 cards per pack, 100 packs per month, deeper practice, and premium learning tools.'
              : `${tierPolicy.maxCardsPerPack} cards per pack, ${
                  tierPolicy.monthlyPackLimit ?? 'unlimited'
                } packs per month.`}{' '}
            {storageCap != null
              ? `${storedCardsCount}/${storageCap} cards stored.`
              : `${storedCardsCount} cards stored.`}
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
            {storageCap != null ? (
              <p className="muted-copy mt-2 text-sm leading-6">
                You can store up to {storageCap} cards on this plan. {Math.max(remainingStorageSlots, 0)} slot
                {Math.max(remainingStorageSlots, 0) === 1 ? '' : 's'} remaining.
              </p>
            ) : null}
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
                    cardCount: event.target.value,
                  })
                }
                type="number"
                className="app-input"
              />
              {cardCountError ? (
                <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  {cardCountError}
                </p>
              ) : null}
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

          <button
            type="submit"
            className="action-button"
            disabled={pending || !hasValidCardCount}
          >
            {pending ? 'Generating…' : 'Generate AI cards'}
          </button>
        </form>

        <div className="soft-card mt-6 p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 text-left"
            onClick={() => setBriefsExpanded((current) => !current)}
          >
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">
                Summarised learning packs ({briefs.length})
              </h3>
              {briefsExpanded ? (
                <p className="muted-copy mt-2 text-sm leading-6">
                  Review saved pack recaps here. Create them from the actions on each AI pack below.
                </p>
              ) : null}
            </div>
            <span className="text-sm font-semibold text-reef">
              {briefsExpanded ? 'Collapse' : 'Expand'}
            </span>
          </button>

          {!showPremiumTools ? (
            <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] px-4 py-5 text-sm muted-copy">
              Premium unlocks saved pack summaries and deeper follow-up learning packs.
              <Link to="/app/pricing" className="ml-2 font-semibold text-reef">
                Unlock premium
              </Link>
            </div>
          ) : null}

          {showPremiumTools && briefsError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {briefsError}
            </div>
          ) : null}

          {showPremiumTools && briefsExpanded ? (
            briefsLoading ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] px-4 py-5 text-sm muted-copy">
                Loading saved summaries…
              </div>
            ) : briefs.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] px-4 py-5 text-sm muted-copy">
                No saved summaries yet. Use `Summarise pack` on one of your saved packs below.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {briefs.map((brief) => (
                  <article
                    key={brief.id}
                    className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() =>
                          setExpandedBriefId((current) =>
                            current === brief.id ? null : brief.id,
                          )
                        }
                      >
                        <div className="text-base font-bold text-ink dark:text-white">
                          {brief.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                          {brief.topic}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={() => void removeBrief(brief.id)}
                      >
                        Delete
                      </button>
                    </div>
                    {expandedBriefId === brief.id ? (
                      <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--app-surface-muted)] px-4 py-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {brief.content}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )
          ) : null}
        </div>

        <div className="soft-card mt-6 p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 text-left"
            onClick={() => setPacksExpanded((current) => !current)}
          >
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">
                Added packs ({generatedPacks.length})
              </h3>
              {packsExpanded ? (
                <p className="muted-copy mt-2 text-sm leading-6">
                  Open a pack to see the questions it added, or delete the whole pack from your learning card library.
                </p>
              ) : null}
            </div>
            <span className="text-sm font-semibold text-reef">
              {packsExpanded ? 'Collapse' : 'Expand'}
            </span>
          </button>

          {packsExpanded ? (
            generatedPacks.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[var(--app-border)] px-4 py-5 text-sm muted-copy">
                No AI packs yet. Generate a topic-based pack to see it listed here.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {generatedPacks.map((pack) => {
                  const isExpanded = expandedPackId === pack.batchId
                  const packMessage =
                    packActionState.packId === pack.batchId ? packActionState.message : null
                  const { depth } = parsePackDepth(pack.topic)
                  const canGoDeeper = depth < 2

                  return (
                    <div
                      key={pack.batchId}
                      className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-4"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
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

                      <div className="mt-4 flex w-full flex-wrap gap-2">
                        {showPremiumTools ? (
                          <>
                            <button
                              type="button"
                              className="ghost-button whitespace-nowrap px-3 py-2 text-xs"
                              onClick={() => void handleGenerateBrief(pack)}
                              disabled={pending}
                            >
                              Summarise pack
                            </button>
                            {canGoDeeper ? (
                              <button
                                type="button"
                                className="ghost-button whitespace-nowrap px-3 py-2 text-xs"
                                onClick={() => void handleGoDeeper(pack)}
                                disabled={pending}
                              >
                                Go deeper
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="shrink-0 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          onClick={() => void handleBulkDelete(pack.cardIds)}
                          disabled={pending}
                        >
                          Delete pack
                        </button>
                      </div>

                      {packMessage ? (
                        <div
                          className={[
                            'mt-4 rounded-2xl px-4 py-3 text-sm',
                            packActionState.tone === 'success'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                              : 'border border-amber-200 bg-amber-50 text-amber-900',
                          ].join(' ')}
                        >
                          {packMessage}
                        </div>
                      ) : null}

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
            )
          ) : null}
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
            No cards yet. Generate a topic-based batch so your next learning
            session has something useful to show.
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
