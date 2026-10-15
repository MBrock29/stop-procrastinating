// Shared by the runtime and offline evaluator so question identity cannot drift.
export function normalizeQuestion(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function parseGeneratedCards(payload) {
  if (!payload || !Array.isArray(payload.cards) || !payload.cards.length ||
    !payload.cards.every(card => card && typeof card.question === 'string' && card.question.trim() &&
      typeof card.answer === 'string' && card.answer.trim() &&
      Object.keys(card).every(key => key === 'question' || key === 'answer'))) {
    throw new Error('Invalid generated card schema.')
  }
  return payload.cards.map(card => ({ question: card.question.trim(), answer: card.answer.trim() }))
}

// Raw Responses API JSON carries text inside output messages; output_text is an SDK convenience.
export function extractResponseText(payload) {
  if (payload?.status === 'incomplete' || payload?.status === 'failed') {
    throw new Error('The model response did not complete.')
  }
  if (typeof payload?.output_text === 'string') return payload.output_text
  if (!Array.isArray(payload?.output)) return ''
  return payload.output.filter(item => item?.type === 'message')
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text).join('')
}
