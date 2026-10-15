// Deterministic smoke checks. These do not establish factual correctness.
import { normalizeQuestion } from '../../supabase/functions/_shared/cardGeneration.mjs'

export function evaluateCards(testCase, payload) {
  const cards = Array.isArray(payload?.cards) ? payload.cards : []
  const schemaValid = cards.length > 0 && cards.every(card =>
    card && typeof card.question === 'string' && card.question.trim().length > 0 &&
    typeof card.answer === 'string' && card.answer.trim().length > 0 &&
    Object.keys(card).every(key => key === 'question' || key === 'answer'))
  const questions = cards.map(card => typeof card?.question === 'string' ? normalizeQuestion(card.question) : '')
  const checks = {
    schemaValid,
    cardCountCorrect: cards.length === testCase.cardCount,
    duplicateFree: schemaValid && questions.every(Boolean) && new Set(questions).size === questions.length,
    conciseAnswers: schemaValid && cards.every(card => card.answer.length <= testCase.maxAnswerChars),
    noLowValuePatterns: schemaValid && questions.every(question =>
      !/\bquestion \d+\b/u.test(question) &&
      (testCase.forbiddenQuestionFragments ?? []).every(fragment => !question.includes(normalizeQuestion(fragment)))),
  }
  const score = Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100)
  return { caseId: testCase.id, score, passed: Object.values(checks).every(Boolean), checks,
    // Future human/judge annotations must remain distinct from deterministic checks.
    correctness: null, relevance: null }
}

export function summarizeResults(results) {
  const knownCosts = results.map(result => result.estimatedCostUsd).filter(value => typeof value === 'number' && Number.isFinite(value))
  return {
    caseCount: results.length,
    passedCount: results.filter(result => result.passed).length,
    averageScore: results.length ? results.reduce((sum, result) => sum + result.score, 0) / results.length : 0,
    passRate: results.length ? results.filter(result => result.passed).length / results.length : 0,
    totalEstimatedCostUsd: knownCosts.length ? knownCosts.reduce((sum, cost) => sum + cost, 0) : null,
    costCoverage: results.length ? knownCosts.length / results.length : 0,
  }
}
