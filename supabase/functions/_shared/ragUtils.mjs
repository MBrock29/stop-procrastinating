export function normalizeSourceText(value) {
  return value.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim()
}

export function chunkSourceText(value, targetChars = 2600, overlapChars = 350) {
  if (!Number.isSafeInteger(targetChars) || targetChars < 100 || !Number.isSafeInteger(overlapChars) ||
    overlapChars < 0 || overlapChars >= targetChars) throw new Error('Invalid chunking configuration')
  const text = normalizeSourceText(value)
  if (!text) return []
  const chunks = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(text.length, start + targetChars)
    if (end < text.length) {
      const paragraph = text.lastIndexOf('\n\n', end)
      const sentence = text.lastIndexOf('. ', end)
      const preferred = Math.max(paragraph, sentence)
      if (preferred > start + Math.floor(targetChars * 0.55)) end = preferred + (preferred === sentence ? 1 : 0)
    }
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= text.length) break
    start = Math.max(start + 1, end - overlapChars)
  }
  return chunks
}

export function validateCitationIndexes(indexes, retrievedChunkCount) {
  if (!Array.isArray(indexes) || indexes.length < 1 || indexes.length > 3 ||
    indexes.some(index => !Number.isSafeInteger(index) || index < 1 || index > retrievedChunkCount)) {
    throw new Error('Invalid citation indexes')
  }
  return [...new Set(indexes)]
}

function terms(value) {
  return value.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).flatMap(term => {
    if (/\p{Script=Han}/u.test(term)) {
      const characters = [...term]
      return characters.slice(0, -1).map((character, index) => character + characters[index + 1])
    }
    return term.length >= 4 ? [term] : []
  })
}

export function lexicalGroundingScore(answer, contexts) {
  const answerTerms = new Set(terms(answer))
  if (!answerTerms.size) return 0
  const contextTerms = new Set(terms(contexts.join(' ')))
  let overlap = 0
  for (const term of answerTerms) if (contextTerms.has(term)) overlap += 1
  return Math.round(overlap / answerTerms.size * 100)
}
