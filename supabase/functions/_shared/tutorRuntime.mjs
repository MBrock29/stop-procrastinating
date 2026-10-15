export const TUTOR_PROMPT_VERSION = 'adaptive-tutor-v1'
export const MAX_TOOL_ROUNDS = 3
export const MAX_TOOL_CALLS = 8

export const TOOL_NAMES = [
  'get_topic_mastery',
  'get_due_cards',
  'get_recent_weaknesses',
  'get_recent_learning_briefs',
]

export function parseToolArguments(raw, toolName) {
  if (!TOOL_NAMES.includes(toolName)) throw new Error(`Unsupported tutor tool: ${toolName}`)
  let parsed
  try { parsed = JSON.parse(raw) } catch { throw new Error(`Invalid arguments for ${toolName}`) }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
    Object.keys(parsed).some(key => key !== 'limit') ||
    !Number.isSafeInteger(parsed.limit)) throw new Error(`Invalid arguments for ${toolName}`)
  const maximum = toolName === 'get_due_cards' ? 30 : toolName === 'get_recent_learning_briefs' ? 10 : 20
  if (parsed.limit < 1 || parsed.limit > maximum) throw new Error(`Invalid limit for ${toolName}`)
  return { limit: parsed.limit }
}

export function getToolCalls(payload) {
  if (!Array.isArray(payload?.output)) return []
  return payload.output.filter(item => item?.type === 'function_call').map(item => {
    if (typeof item.name !== 'string' || typeof item.arguments !== 'string' ||
      typeof item.call_id !== 'string' || !item.call_id) throw new Error('Malformed tutor tool call')
    return item
  })
}

export function extractTutorText(payload) {
  if (payload?.status === 'incomplete' || payload?.status === 'failed') {
    throw new Error('The tutor model response did not complete')
  }
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text
  if (!Array.isArray(payload?.output)) return ''
  return payload.output.filter(item => item?.type === 'message')
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text).join('')
}

export function parseTutorRecommendation(raw) {
  let value
  try { value = JSON.parse(raw) } catch { throw new Error('Tutor returned invalid JSON') }
  const keys = ['headline', 'focusTopic', 'reason', 'actions', 'estimatedMinutes', 'confidence']
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value)) ||
    !['headline', 'focusTopic', 'reason'].every(key => typeof value[key] === 'string' && value[key].trim()) ||
    !Array.isArray(value.actions) || value.actions.length < 1 || value.actions.length > 5 ||
    !value.actions.every(action => typeof action === 'string' && action.trim()) ||
    !Number.isSafeInteger(value.estimatedMinutes) || value.estimatedMinutes < 3 || value.estimatedMinutes > 20 ||
    !['high', 'medium', 'low'].includes(value.confidence)) {
    throw new Error('Tutor returned an invalid recommendation')
  }
  return { headline: value.headline.trim(), focusTopic: value.focusTopic.trim(), reason: value.reason.trim(),
    actions: value.actions.map(action => action.trim()), estimatedMinutes: value.estimatedMinutes,
    confidence: value.confidence }
}

export function compactToolResult(value, maximumCharacters = 2000) {
  const raw = JSON.stringify(value)
  return raw.length <= maximumCharacters ? value : { truncated: true, itemCount: Array.isArray(value) ? value.length : null,
    preview: raw.slice(0, maximumCharacters) }
}

export function estimateTutorCost(model, inputTokens, outputTokens) {
  const rates = {
    'gpt-4.1-mini': { input: 0.4, output: 1.6 },
    'gpt-5-mini': { input: 0.25, output: 2 },
    'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  }[model]
  if (!rates || inputTokens == null || outputTokens == null) return null
  return Number(((inputTokens * rates.input + outputTokens * rates.output) / 1_000_000).toFixed(6))
}
