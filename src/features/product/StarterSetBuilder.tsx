import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useAiAccess } from '../ai-access/useAiAccess'
import {
  generateCardsWithAi,
  type GeneratedCardDraft,
} from '../cards/aiGenerator'
import type { LearningCard } from '../../types/domain'
import { buildGeneratedStarterOptions, LEARNING_PATHS } from './learningPaths'
import {
  findRelevantStarterTemplates,
  STARTER_TEMPLATES,
  type StarterTemplate,
} from './learningTemplates'
import { Icon } from '../../ui/Icon'

type CardInput = GeneratedCardDraft & {
  source: 'manual' | 'ai'
  generationTopic: string
  generationBatchId: string
}

export interface StarterSelection {
  category: string
  goal: string
  topic: string
}

export function StarterSetBuilder({
  existingCards,
  onAdd,
  onComplete,
}: {
  existingCards: LearningCard[]
  onAdd: (cards: CardInput[]) => Promise<unknown>
  onComplete?: (selection: StarterSelection) => void
}) {
  const { mode } = useAuth()
  const { settings, tierPolicy, usage, refresh } = useAiAccess()
  const [categoryId, setCategoryId] = useState('custom')
  const category =
    LEARNING_PATHS.find((item) => item.id === categoryId) ?? LEARNING_PATHS[0]
  const [subcategory, setSubcategory] = useState('My own topic')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('Beginner')
  const [optionsVisible, setOptionsVisible] = useState(false)
  const [preview, setPreview] = useState<{
    title: string
    topic: string
    cards: GeneratedCardDraft[]
    source: 'manual' | 'ai'
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const options = buildGeneratedStarterOptions(
    category.label,
    subcategory,
    goal,
  )
  const matches = findRelevantStarterTemplates(
    category.label,
    `${subcategory} ${goal}`,
  )
  const remaining = Math.max(
    0,
    (tierPolicy.maxStoredCards ?? Infinity) - existingCards.length,
  )
  const count = Math.min(10, tierPolicy.maxCardsPerPack, remaining)
  const quotaReached =
    tierPolicy.monthlyPackLimit != null &&
    usage.currentMonthPacksUsed >= tierPolicy.monthlyPackLimit

  function resetOptions() {
    setOptionsVisible(false)
    setPreview(null)
    setError(null)
    setMessage(null)
  }

  function previewTemplate(template: StarterTemplate) {
    setPreview({
      title: template.title,
      topic: template.topic,
      cards: template.cards,
      source: 'manual',
    })
    setError(null)
    setMessage(null)
  }

  async function generate(title: string, topic: string) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await generateCardsWithAi({
        topic: `${topic}. Level: ${level}.`.slice(0, 500),
        cardCount: count,
        requestedModel:
          settings.planTier === 'byok' ? settings.preferredModel : null,
        byokProvider:
          settings.planTier === 'byok' ? settings.byokProvider : null,
      })
      setPreview({
        title,
        topic: goal.trim() || title,
        cards: result.cards,
        source: 'ai',
      })
      await refresh()
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to prepare this set. Try again or choose ready-made questions.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const existing = new Set(
        existingCards.map((card) => card.question.trim().toLowerCase()),
      )
      const cards = preview.cards.filter(
        (card) => !existing.has(card.question.trim().toLowerCase()),
      )
      if (cards.length > remaining)
        throw new Error(
          'Your library is full. Archive or remove some cards, or review your plan in Settings.',
        )
      const batch = crypto.randomUUID()
      if (cards.length)
        await onAdd(
          cards.map((card) => ({
            ...card,
            source: preview.source,
            generationTopic: preview.topic,
            generationBatchId: batch,
          })),
        )
      setMessage(
        cards.length
          ? `${cards.length} questions added. They are ready for your next useful pause.`
          : 'These questions are already in your library.',
      )
      onComplete?.({
        category: `${category.label} · ${subcategory}`,
        goal: goal.trim() || preview.topic,
        topic: preview.topic,
      })
      setPreview(null)
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : 'Unable to save these questions. Your preview is still available to retry.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="section-kicker">A little learning, made for you</p>
        <h2 className="mt-2 text-2xl font-bold">What are you curious about?</h2>
        <p className="mt-2 text-sm leading-6 muted-copy">
          Start with your own goal, or choose an area for inspiration.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setOptionsVisible(true)
          setPreview(null)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Category
            <select
              className="app-input mt-2"
              value={categoryId}
              disabled={busy}
              onChange={(event) => {
                const next = LEARNING_PATHS.find(
                  (item) => item.id === event.target.value,
                )!
                setCategoryId(next.id)
                setSubcategory(next.subcategories[0])
                resetOptions()
              }}
            >
              {LEARNING_PATHS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {categoryId !== 'custom' ? (
            <label className="text-sm font-semibold">
              Area
              <select
                className="app-input mt-2"
                value={subcategory}
                disabled={busy}
                onChange={(event) => {
                  setSubcategory(event.target.value)
                  resetOptions()
                }}
              >
                {category.subcategories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <label className="block text-sm font-semibold">
          Your learning goal
          <input
            required
            maxLength={350}
            className="app-input mt-2"
            value={goal}
            disabled={busy}
            onChange={(event) => {
              setGoal(event.target.value)
              resetOptions()
            }}
            placeholder="French for my trip, understanding climate change, React interviews…"
          />
        </label>
        <label className="block text-sm font-semibold">
          Where are you starting?
          <select
            className="app-input mt-2"
            value={level}
            disabled={busy}
            onChange={(event) => {
              setLevel(event.target.value)
              resetOptions()
            }}
          >
            <option>Beginner</option>
            <option>Some experience</option>
            <option>Advanced / exam preparation</option>
          </select>
        </label>
        <button className="action-button" disabled={busy || !goal.trim()}>
          Find my starter options
          <Icon name="arrow" />
        </button>
      </form>

      {optionsVisible && !preview ? (
        <div className="space-y-3 border-t border-[var(--app-border)] pt-5">
          <p className="text-sm font-semibold">Choose your starting point</p>
          {mode === 'demo' ? (
            <p className="soft-card p-3 text-xs leading-5 muted-copy">
              You are in local preview. Personalised generation becomes
              available with your connected account. You can preview and use any
              ready-made set below.
            </p>
          ) : (
            <p className="text-xs muted-copy">
              Only your selected set is generated. Preparing a preview uses one
              material request.
            </p>
          )}
          {matches.map((template) => (
            <button
              key={template.id}
              disabled={busy}
              onClick={() => previewTemplate(template)}
              className="soft-card w-full p-4 text-left"
            >
              <span className="section-kicker">Ready immediately</span>
              <strong className="mt-1 block text-sm">{template.title}</strong>
              <span className="muted-copy mt-1 block text-xs">
                {template.description}
              </span>
            </button>
          ))}
          {options.map((option) => (
            <button
              key={option.id}
              disabled={busy || mode === 'demo' || count < 1 || quotaReached}
              onClick={() => void generate(option.title, option.topic)}
              className="soft-card flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <span>
                <strong className="block text-sm">{option.title}</strong>
                <span className="muted-copy mt-1 block text-xs">
                  {option.description}
                </span>
              </span>
              <Icon name="arrow" className="shrink-0" />
            </button>
          ))}
          {quotaReached ? (
            <p className="text-xs muted-copy">
              Your monthly generation allowance is used. Ready-made sets and
              your own questions are still available.
            </p>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-xl border border-reef/30 p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="section-kicker">Preview before adding</p>
              <h3 className="mt-2 text-lg font-bold">{preview.title}</h3>
            </div>
            <span className="status-pill">
              {preview.cards.length} questions
            </span>
          </div>
          <p className="mt-2 text-xs muted-copy">
            Check that the level and subject feel right. You can edit questions
            after adding them.
          </p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {preview.cards.map((card, index) => (
              <details
                key={`${index}-${card.question}`}
                className="soft-card p-3 text-sm"
              >
                <summary className="font-medium">{card.question}</summary>
                <p className="mt-3 leading-6 muted-copy">{card.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={busy}
              className="action-button"
              onClick={() => void save()}
            >
              {busy ? 'Adding…' : 'Add to my learning'}
              <Icon name="check" />
            </button>
            <button
              disabled={busy}
              className="ghost-button"
              onClick={() => setPreview(null)}
            >
              Choose a different set
            </button>
          </div>
        </div>
      ) : null}
      {busy ? (
        <p role="status" className="text-sm muted-copy">
          Preparing your learning set…
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </p>
      ) : null}
      <details className="border-t border-[var(--app-border)] pt-4">
        <summary className="text-sm font-semibold text-reef">
          Browse ready-made sets
        </summary>
        <p className="muted-copy mt-2 text-xs">
          Optional starting points. Choose one only if it interests you.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {STARTER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              disabled={busy}
              onClick={() => previewTemplate(template)}
              className="soft-card p-3 text-left"
            >
              <strong className="text-sm">{template.title}</strong>
              <span className="mt-1 block text-xs muted-copy">
                {template.category} · {template.cards.length} questions
              </span>
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}
