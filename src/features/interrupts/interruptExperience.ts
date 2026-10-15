import type { InterventionMode, LearningCard } from '../../types/domain'
import { isCardDue, sortCardsForReview } from '../cards/scheduling'

export function getSafeReturnUrl(raw: string | null, site: string | null) {
  if (!raw || !site) return null
  try {
    const url = new URL(raw)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.hostname !== site ||
      url.username ||
      url.password
    )
      return null
    return url.toString()
  } catch {
    return null
  }
}

export function selectInterruptCards(
  cards: LearningCard[],
  mode: InterventionMode,
  topic: string | null,
  source: 'extension' | 'practice' | 'onboarding',
  now = new Date(),
) {
  const relevant = cards.filter(
    (card) =>
      !card.isArchived &&
      (!topic ||
        (card.generationTopic?.trim() || 'My own questions').toLowerCase() ===
          topic.trim().toLowerCase()),
  )
  const sorted = sortCardsForReview(
    source === 'extension'
      ? relevant.filter((card) => isCardDue(card, now))
      : relevant,
    now,
  )
  const count =
    mode === 'focus'
      ? 3
      : mode === 'smart' && sorted[0]?.latestConfidence === 'not_confident'
        ? 3
        : 1
  return sorted.slice(0, count)
}
