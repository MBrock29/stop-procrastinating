# Card generation evaluation

`npm run eval:ai` runs 28 stable, offline evaluator regression fixtures without keys,
network calls or model spend. It checks that known good and bad payloads are classified
as expected. Its score is **evaluator regression accuracy**, not generated-card quality.
The initial offline baseline is 28/28 expected classifications (100%). Cost, tokens
and model latency are unknown for these stored fixtures.

`npm run test:ai` also tests runtime response parsing and Unicode question identity.
`npm test` includes embedded Postgres mastery/RLS tests with no database server needed.

## Live model evaluation

Set `SUPABASE_FUNCTION_URL`, `SUPABASE_ANON_KEY`, and a signed-in test user's
`SUPABASE_ACCESS_TOKEN`, then run `npm run eval:ai:live`. Optional `EVAL_MODEL` is a
requested model; server plan routing still determines the actual model in the report.
Use a dedicated test account with sufficient quota: the suite makes 25 real requests
and waits 10.1 seconds between them to respect cooldown. Requests count against the
account's limits and incur provider cost. Existing cards can affect duplicate checks.

Reports are written to ignored `evals/results/offline-latest.json` or
`evals/results/live-latest.json`. Copy each live report to a distinct filename before
running another candidate. Compare matching live suites with:

```sh
node scripts/compare-ai-evals.mjs evals/results/candidate-a.json evals/results/candidate-b.json
```

The comparator rejects offline reports or mismatched case IDs. Compare runs on the
same controlled account state. Save actual model and prompt identifiers, not just the
requested configuration. Unknown costs remain unknown and cost coverage is reported.
Correctness/relevance fields are unscored hooks for future human or judge annotations.
Neither concision nor duplicate freedom demonstrates factual accuracy.

After applying the migration, an operator can publish a saved report:

```sh
node scripts/publish-ai-eval.mjs evals/results/live-latest.json
```

This requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `EVAL_USER_ID` in the
operator's environment. Do not put the service key into browser variables. Clients can
read only their own published history and cannot publish fabricated eval runs.

No live model baseline has been recorded yet. Do not enable cost/quality regression
thresholds using the offline score as a substitute.

Protocol reference: [OpenAI function and output item contracts](https://developers.openai.com/api/docs/guides/function-calling).
Database test API: [PGlite query and exec](https://pglite.dev/docs/api).
