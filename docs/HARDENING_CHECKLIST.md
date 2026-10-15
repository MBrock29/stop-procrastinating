# Hardening checklist

## Verified locally

- [x] ESLint covers application and extension source while excluding reference bundles.
- [x] TypeScript and Vite production build succeeds.
- [x] Chrome extension build succeeds.
- [x] Edge Function entry points bundle with their shared modules.
- [x] Offline evaluator fixtures pass without network access or secrets.
- [x] PGlite executes mastery, tutor, pgvector, feedback, and queue migrations.
- [x] RLS tests cover owner reads, cross-owner isolation, and denied browser writes.
- [x] Grounded card persistence is atomic and validates source ownership.
- [x] Feedback uses owner-consistent composite foreign keys.
- [x] Queue inserts are service-owned; browser roles have read-only owner access.
- [x] Queue claims use `FOR UPDATE SKIP LOCKED`.
- [x] Completion and failure transitions require the current worker and lock token.
- [x] Stale processing locks recover to retry or dead-letter state.
- [x] Queue payloads are sanitized and exclude access tokens and API keys.
- [x] CI runs lint, tests, offline evals, Edge bundling, and both builds.

## Required before hosted release

- [ ] Apply the full migration chain to a disposable Supabase project and inspect migration warnings.
- [ ] Deploy all changed Edge Functions together with their prerequisite migrations.
- [ ] Store a strong `GENERATION_WORKER_SECRET` and restrict scheduler access.
- [ ] Confirm service-role RPC grants and browser RLS with real Supabase JWTs.
- [ ] Exercise card, brief, grounded-card, and tutor quota boundaries on each plan.
- [ ] Run two workers concurrently and kill one during processing to observe stale recovery.
- [ ] Decide whether artifact persistence and job completion need a single database transaction for the target operating scale.
- [ ] Exercise storage-limit races and monthly quota races under concurrent requests.
- [ ] Run the 25-case live eval suite on a dedicated account and record model/prompt baselines.
- [ ] Add labeled retrieval-recall and answer-faithfulness cases.
- [ ] Test Chrome navigation through redirect, review, and return URL in a real browser.
- [ ] Check keyboard navigation, narrow layouts, dark mode, and error states manually.
- [ ] Capture current product screenshots after the deployed schema and UI match.
- [ ] Configure log retention, alert thresholds, secret rotation, and database backups.

## Deployment order

1. Apply migrations through `20261016090000_default_always_on_protection.sql`.
2. Configure provider, encryption, service-role, and worker secrets.
3. Deploy generation, tutor, ingestion, queue, and worker functions.
4. Deploy the web app and build/load the matching extension.
5. Start the trusted worker scheduler.
6. Run hosted smoke tests before enabling access broadly.
