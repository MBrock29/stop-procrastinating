import { readFile } from 'node:fs/promises'

// Deliberate operator action. Never expose this key in a VITE_ environment variable.
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EVAL_USER_ID } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !EVAL_USER_ID || !process.argv[2]) {
  throw new Error('Provide a report path and SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EVAL_USER_ID.')
}
const report = JSON.parse(await readFile(process.argv[2], 'utf8'))
if (!['offline-evaluator', 'live-model'].includes(report.mode) || !report.suite || !Array.isArray(report.results)) {
  throw new Error('Invalid eval report.')
}
const response = await fetch(`${SUPABASE_URL}/rest/v1/ai_eval_runs`, {
  method: 'POST', signal: AbortSignal.timeout(30_000),
  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ user_id: EVAL_USER_ID, suite_name: report.suite, mode: report.mode, report }),
})
if (!response.ok) throw new Error(`Eval publication failed: HTTP ${response.status}`)
console.log('Eval report published.')
