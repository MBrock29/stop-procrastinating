import { readFile } from 'node:fs/promises'

const paths = process.argv.slice(2)
if (paths.length < 2) throw new Error('Provide at least two saved live eval reports.')
const reports = await Promise.all(paths.map(async path => ({ path, ...JSON.parse(await readFile(path, 'utf8')) })))
const baselineCases = reports[0].results.map(result => result.caseId).sort().join('|')
for (const report of reports) {
  if (report.mode !== 'live-model' || report.suite !== reports[0].suite ||
    report.results.map(result => result.caseId).sort().join('|') !== baselineCases) {
    throw new Error('Compare live reports from the same suite and fixture set. Offline evaluator scores are not model scores.')
  }
}
console.table(reports.map(report => ({
  report: report.path,
  models: [...new Set(report.results.map(result => result.model).filter(Boolean))].join(', '),
  prompts: [...new Set(report.results.map(result => result.promptVersion).filter(Boolean))].join(', '),
  averageScore: report.averageScore,
  passRate: report.passRate,
  meanLatencyMs: report.results.reduce((sum, result) => sum + result.latencyMs, 0) / report.results.length,
  estimatedCostUsd: report.totalEstimatedCostUsd ?? 'unknown',
  costCoverage: report.costCoverage,
})))
