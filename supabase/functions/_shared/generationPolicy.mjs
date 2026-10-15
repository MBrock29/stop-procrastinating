export const GENERATION_JOB_TYPES = ['cards', 'grounded_cards', 'brief']

const POLICIES = {
  free: { maxCards: 10, maxAttempts: 3, allowGrounded: false, allowBrief: false },
  pro: { maxCards: 100, maxAttempts: 4, allowGrounded: false, allowBrief: false },
  premium: { maxCards: 100, maxAttempts: 4, allowGrounded: true, allowBrief: true },
  byok: { maxCards: 100, maxAttempts: 3, allowGrounded: false, allowBrief: false },
}

export function getGenerationPolicy(planTier, ownerOverride = false) {
  if (ownerOverride) return { maxCards: 100, maxAttempts: 4, allowGrounded: true, allowBrief: true }
  return POLICIES[planTier] ?? POLICIES.free
}

export function sanitizeGenerationPayload(jobType, rawPayload, policy) {
  if (!GENERATION_JOB_TYPES.includes(jobType)) throw new Error('Unsupported generation job type.')
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new Error('A job payload object is required.')
  }
  const topic = typeof rawPayload.topic === 'string' ? rawPayload.topic.trim() : ''
  if (!topic || topic.length > 500) throw new Error('A topic of 1–500 characters is required.')

  if (jobType === 'brief') {
    if (!policy.allowBrief) throw new Error('Brief generation is not enabled for this plan.')
    if (!Array.isArray(rawPayload.cards) || rawPayload.cards.length < 1 || rawPayload.cards.length > 100) {
      throw new Error('Brief generation requires 1–100 cards.')
    }
    const cards = rawPayload.cards.map(card => {
      if (!card || typeof card !== 'object' || Array.isArray(card) ||
        typeof card.question !== 'string' || !card.question.trim() || card.question.length > 1000 ||
        typeof card.answer !== 'string' || !card.answer.trim() || card.answer.length > 5000) {
        throw new Error('Each brief card needs a bounded question and answer.')
      }
      return { question: card.question.trim(), answer: card.answer.trim() }
    })
    return { topic, cards }
  }

  const cardCount = rawPayload.cardCount ?? 10
  if (typeof cardCount !== 'number' || !Number.isSafeInteger(cardCount) || cardCount < 1 ||
    cardCount > policy.maxCards || (jobType === 'grounded_cards' && cardCount > 20)) {
    throw new Error(`Card count must be an integer within the ${jobType === 'grounded_cards' ? Math.min(20, policy.maxCards) : policy.maxCards}-card limit.`)
  }
  if (jobType === 'grounded_cards') {
    if (!policy.allowGrounded) throw new Error('Grounded generation is not enabled for this plan.')
    const sourceId = typeof rawPayload.sourceId === 'string' ? rawPayload.sourceId.trim() : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) {
      throw new Error('A valid source ID is required for grounded generation.')
    }
    return { topic, cardCount, sourceId }
  }
  const requestedModel = typeof rawPayload.requestedModel === 'string' ? rawPayload.requestedModel : undefined
  return { topic, cardCount, ...(requestedModel ? { requestedModel } : {}) }
}

export function getRetryDelaySeconds(attempt) {
  const normalized = Math.max(1, Math.floor(Number(attempt) || 1))
  return Math.min(300, 10 * 2 ** (normalized - 1))
}

export function makeIdempotencyKey({ jobType, payload, bucket = new Date().toISOString().slice(0, 13) }) {
  const stable = JSON.stringify(payload, Object.keys(payload).sort())
  return `${jobType}:${stable}:${bucket}`
}
