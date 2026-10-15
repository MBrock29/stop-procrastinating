import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { submitAiCardFeedback, type AiCardFeedbackType } from './feedbackRepository'

const options: Array<{ value: AiCardFeedbackType; label: string }> = [
  { value: 'useful', label: 'Useful' }, { value: 'incorrect', label: 'Incorrect' },
  { value: 'too_easy', label: 'Too easy' }, { value: 'too_hard', label: 'Too hard' },
  { value: 'weak_citation', label: 'Weak citation' },
]

export function AiCardFeedback({ cardId, sourceId }: { cardId: string; sourceId?: string | null }) {
  const { user, mode } = useAuth(); const [selected, setSelected] = useState<AiCardFeedbackType | null>(null)
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  if (!user || mode !== 'supabase') return null
  async function submit(value: AiCardFeedbackType) {
    if (!user) return
    setBusy(true); setError(null)
    try { await submitAiCardFeedback({ userId: user.id, cardId, sourceId, feedbackType: value }); setSelected(value) }
    catch (next) { setError(next instanceof Error ? next.message : 'Unable to save feedback.') }
    finally { setBusy(false) }
  }
  return <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
    <p className="text-xs font-semibold text-[var(--app-muted)]">Was this question helpful?</p>
    <div className="mt-3 flex flex-wrap gap-2">{options.map(option => <button key={option.value}
      type="button" disabled={busy} onClick={() => void submit(option.value)} aria-pressed={selected === option.value}
      className={`ghost-button h-9 px-3 text-xs ${selected === option.value ? 'ring-2 ring-reef' : ''}`}>
      {option.label}</button>)}</div>
    {selected ? <p role="status" className="muted-copy mt-2 text-xs">Feedback saved.</p> : null}
    {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
  </div>
}
