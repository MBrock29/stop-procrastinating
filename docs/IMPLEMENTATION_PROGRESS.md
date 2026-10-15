# Handoff implementation progress

Updated 16 October 2026. This records repository evidence, not production deployment.

## Baseline

The original app has authentication, blocking/extension syncing, cards, confidence
reviews, learning briefs, generation events, plan/model routing, BYOK and billing.
All five reference bundles are available under the ignored `_ai-showcase-reference/`
directory. They contain design examples and incomplete services, not integrated features.

Initial application baseline: 16 tests passed, web and extension built. Lint initially
failed because it included reference files. ESLint and Vitest now exclude the reference
directory while continuing to check real application and extension code.

## Tranche 1 implemented locally

- Generation events extend the existing table with request ID, prompt version and
  elapsed request latency. Successful generation responses include token usage and
  these identifiers; browser event mapping preserves them. Older events remain null.
- Raw OpenAI Responses output is read from output message content. Both provider
  calls have a 60-second timeout. Malformed packs are rejected as a whole, and Unicode
  question normalization is shared by runtime and evaluator.
- Request topic/card count validation rejects malformed JSON, non-objects, fractional
  counts and oversized topics. Settings, cooldown, usage and duplicate lookup failures
  return an error rather than silently allowing generation.
- An after-insert review trigger persists topic mastery with atomic counter updates,
  backfills recorded reviews, and validates card/session ownership. RLS allows owners
  to read mastery; clients cannot write the derived aggregate or eval history.
- Dashboard topic confidence has loading, empty and error states. Demo mode derives
  it from existing locally persisted card counters. No synthetic attempts are added.
- 28 offline evaluator fixtures exercise schema, count, duplicate, Unicode, length
  and placeholder checks. A separate set of 25 live generation topics is provided.
- Eval reports retain timing, returned model/provider/prompt identifiers, tokens and
  known estimated costs. Missing cost is unknown, not zero. Correctness and relevance
  annotations are reserved separately; deterministic checks do not prove either.
- Saved live reports can be compared. A separate operator script can publish reports
  to the read-only-per-owner `ai_eval_runs` history table.

Confidence is `(know + 0.5 * semi) / attempts * 100`. Suggested review is 1 day below
50%, 3 days from 50%, and 7 days from 80%, relative to the latest review. This is a
self-report heuristic; it does not change the existing interrupt card selection.
Topic keys are trimmed and lowercased. Historical persisted mastery remains when
cards are deleted; demo mode reflects currently stored cards only.

## Verification and deployment boundary

The migration is exercised with PGlite (embedded Postgres), using the real prerequisite
card/review/AI migrations and a minimal Supabase auth stub. Tests cover backfill,
out-of-order reviews, owner isolation, client write rejection and cross-owner references.
This does not replace testing the full migration chain on local/hosted Supabase.

The Vite development page returned HTTP 200 with the app entry point. Browser interaction,
Chrome redirect/review end-to-end tests, hosted migrations and live AI calls have not run.
No credentials were configured for live evals. No migration was applied remotely.

Apply `20261015210000_ai_observability_and_mastery.sql` before deploying the modified
`generate-learning-cards` function. Otherwise telemetry writes will reference missing columns.
The production build still reports the pre-existing bundle-size advisory.

## Tranche 2 implemented locally

- `/app/tutor` provides one bounded adaptive tutor. Its first model round must call
  at least one learner-state tool. It can inspect topic mastery, due cards, recent
  weak reviews and recent brief metadata. It is limited to three tool rounds and
  eight total calls, with strict tool names, exact argument schemas and structured
  recommendation validation.
- Hosted tutor access is enforced server-side for Premium accounts (plus the existing
  owner override), with a 30-second cooldown and 100-run monthly limit. Demo mode
  builds a deterministic recommendation from local cards and briefs and explicitly
  labels that no model call occurred.
- Tutor runs record request/model/prompt IDs, status, timing, tokens, known cost and
  failure details. Tool traces record ordered calls, arguments, compact results,
  status and timing. Browser roles have read-only owner access; the service role writes
  the run and trace atomically through `record_ai_tutor_run` so partial traces cannot
  be presented as complete runs.
- `/app/ai-ops` reports 30-day generation success, failures, policy rejections,
  average/p95 latency, combined generation+tutor tokens, known estimated cost and
  cost coverage, tutor activity, and the latest published eval score. Missing cost
  or latency stays unknown instead of becoming zero.
- Runtime and database tests cover tool argument injection, malformed calls,
  recommendation schemas, deterministic sparse-data behaviour, metric calculations,
  owner isolation, browser write denial, trace ownership and atomic persistence.

Apply `20261015213000_adaptive_tutor_and_ai_ops.sql` after the tranche 1 migration,
then deploy `adaptive-tutor`. It needs the standard Supabase URL/anon/service-role
secrets plus `OPENAI_API_KEY`; `AI_TUTOR_MODEL` is optional. The hosted function and
live tool-calling path have not been deployed or exercised against a real project.

## Tranche 3 implemented locally

- `/app/sources` accepts pasted or externally extracted text and optional URL metadata.
  Edge Functions never fetch the supplied URL. Content is normalized, split with
  bounded overlap, embedded in batches and stored in user-owned pgvector chunks.
- Vector retrieval derives ownership from `auth.uid()` inside a security-invoker SQL
  function; callers cannot supply a different user ID. Source/chunk RLS permits owner
  reads and source deletion, while browser roles cannot fabricate chunks or grounded
  telemetry.
- Grounded generation validates Premium access and source ownership, embeds the topic,
  retrieves up to eight chunks, and requires every structured card to cite one to three
  valid retrieved indexes. Questions are checked against the pack and existing topic
  cards. Citation IDs/excerpts and a lexical overlap smoke signal are hydrated from the
  stored chunks rather than accepted from model text.
- Cited cards and their generation event are persisted atomically into the existing
  learning-card flow through a service-only function. The UI reports citations and
  explicitly labels lexical overlap as a smoke test rather than factual verification.
- AI Ops now includes grounded-run counts and mean grounding smoke-test pass rate.
- Deterministic tests cover normalization, overlap chunking, invalid chunk settings,
  Unicode overlap, citation indexes, pgvector retrieval isolation, browser write denial,
  atomic cited-card persistence and cross-owner rejection.

Apply `20261015220000_grounded_learning_sources.sql` after tranches 1 and 2, then
deploy `ingest-learning-source` and `generate-grounded-learning-cards`. Both need
the Supabase service-role secret and `OPENAI_API_KEY`; embedding/generation model
environment overrides are optional. PGlite with the pgvector extension executes the
migration and its ownership tests locally. Hosted pgvector, live embeddings, retrieval
quality and model faithfulness have not been evaluated.

## Tranche 4 implemented locally

- Grounded responses now expose the IDs assigned to persisted cards. Users can submit
  one current structured feedback value per card: useful, incorrect, too easy, too hard
  or weak citation. Composite foreign keys enforce that the referenced card and optional
  source belong to the same user as the feedback row.
- `/app/jobs` queues ordinary card packs with an explicit idempotency key and shows the
  owner's latest states. The server also accepts validated grounded-card and brief jobs.
  Browser roles cannot create or mutate queue rows directly.
- Jobs use queued, processing, succeeded, failed and dead-letter states. Claims use
  `FOR UPDATE SKIP LOCKED`; every claim receives a new lock token. Completion and failure
  require the job ID, worker ID and current token, preventing an expired worker from
  overwriting a later claim.
- Retry delays start at 10 seconds and double to a five-minute ceiling. Stale processing
  locks recover after ten minutes. Attempts at the configured limit move to dead letter.
- Queue inputs are rebuilt from a closed schema. User JWTs, provider keys and arbitrary
  fields are not persisted. A database constraint also rejects common credential keys.
- The worker uses the service role and a separate worker secret. It invokes the same
  card, grounded-card and brief handlers used synchronously through a shared internal
  identity helper, so their plan, quota, count, ownership and model-routing rules remain
  authoritative. The job ID is used as the generation batch for retry recovery.
- Prompt/model comparison remains file-based and operator-controlled. The comparator
  rejects offline reports and mismatched live suites, then reports score, pass rate,
  latency, known cost and cost coverage.

Database tests cover feedback ownership, browser queue write denial, idempotency,
credential rejection, exclusive claims, fenced completion, retry/dead-letter transitions
and stale-lock recovery. Pure tests cover payload policy and backoff.

## Tranche 5 hardening and presentation implemented locally

- GitHub Actions run npm clean install, lint, all tests, AI-specific tests, the offline
  evaluator regression, Edge Function bundle checks, and web/extension production builds.
  Live AI evals are a separate manual workflow requiring an exact cost confirmation and
  dedicated secrets; reports are retained as artifacts.
- `npm run check:edge` bundles seven AI-related Edge entry points and shared imports without
  writing build artifacts. `npm run quality` mirrors the full local quality sequence.
- The public README now leads with the interruption product and accurately describes the
  implemented AI system, local setup, extension, deployment boundary and limitations.
- Architecture, case-study, hardening and interview-evidence documents map design claims
  to source and tests. Mermaid diagrams cover the overall app, tutor, RAG and queue.

Local validation after tranche 5: lint passed, 83 tests passed, the web and extension
built, and the five changed queue/generation functions bundled. The production build
continues to report the existing bundle-size advisory.

## Consumer product direction implemented locally

- The public landing page now leads with “Stop doomscrolling. Learn something instead,”
  demonstrates the interruption loop, explains the three steps, and presents concrete
  use cases, personalization and learning-from-your-own-material without exposing model
  or infrastructure choices.
- Registration enters a six-step onboarding flow: choose distracting sites, choose a
  learning category and goal, install a real ten-card starter template, connect Chrome,
  and run a safe test interruption. Re-running setup does not duplicate template cards.
- The dashboard is outcome-first. It calculates completed learning moments, bypasses,
  completion rate and a clearly labelled time estimate from persisted interruption
  sessions. Setup health and weak-topic prompts use real account data.
- Extension rules now carry per-site weekday/time schedules, snooze state and quick,
  focus, intentional, soft, hard or smart intervention modes. Overnight windows preserve
  the starting day's rule. Interruptions always show a clear continuation path and record
  started, completed or bypassed outcomes.
- Onboarding uses broad learning categories followed by relevant subcategories and the
  learner's own goal. It builds three tailored starter-set options from that input and
  only surfaces one of the four curated ten-question templates when its topic genuinely
  matches. This supports interests outside the initial catalogue without forcing an
  irrelevant Spanish or programming set. Learning-card, tutor and source screens use
  customer language and keep technical diagnostics in advanced views.
- Public pricing is Free and Better Focus Pro. The existing Pro, Premium and BYOK
  entitlements remain compatible internally; new paid checkout uses the existing Premium
  product mapping, avoiding a billing migration.
- Owner-scoped product profiles and closed-schema events record onboarding, extension
  install intent, interruption outcomes, source creation, upgrades, and site-rule pause or
  resume actions. Event payloads are bounded and dashboard outcomes are derived from
  sessions rather than client telemetry.

PGlite tests exercise the new migration's defaults, constraints, RLS and event bounds.
Pure tests cover outcome calculations and schedule behavior, including overnight rules.
The database changes still require hosted Supabase migration testing, and Chrome needs a
real extension-to-interruption browser run before release.

Validation after the consumer product work: lint passed, 93 tests passed across 19 test
files, all 37 AI-specific tests passed, the offline evaluator passed 28/28 fixtures,
seven Edge Function entry points bundled, and both web and extension production builds
completed. Vite continues to report the existing large-chunk advisory.

## Always-on protection and landing screenshots (16 October 2026)

- New sites now default to all seven days and explicit all-day protection. The extension
  checks the all-day flag before time-window logic, covering midnight and the final
  seconds of each day. Snooze and selected-day restrictions still apply.
- `20261016090000_default_always_on_protection.sql` adds the all-day flag while preserving
  existing custom schedules, then changes database defaults for new sites. Local preview,
  onboarding copy, site summaries and extension sync agree with that default.
- Site preferences include a “Protect all day” checkbox; custom hours remain available
  when unchecked. Existing custom schedules are not overwritten.
- Removed the landing hero's interactive “Becomes a useful pause” panel. The headline,
  explanation and calls to action now occupy the full hero width.
- Added three actual app screenshots under `public/screenshots/`, captured in an isolated
  local-preview profile using real curated questions and UI actions. A signed-out visitor
  can inspect the learning pause, library and distraction controls, and open each image
  at full size. Example learning material is labelled; no customer usage is invented.
- `scripts/capture-landing-screenshots.mjs` reproduces the assets; `scripts/review-landing.mjs`
  checks the public page's images, full-width layout, links, overflow and accessibility.

Validation: lint passed, 105 tests across 21 files passed, and web/extension production
builds passed. New tests cover all-day behavior on every weekday at midnight, overnight
and 23:59:59, pause handling, database defaults and preservation of existing schedules.
The signed-out landing passed desktop (1440px) and mobile (390px) checks in light and
dark themes with no axe findings or page errors. The local product walkthrough also
passed, including changing always-on protection to custom weekday hours.

## Remaining environment validation

### Commercial review and design refinement (15 October 2026)

The detailed assessment and competitor sources are in `COMMERCIAL_PRODUCT_REVIEW.md`.
This refinement supersedes the earlier six-step onboarding and dashboard time-estimate
presentation described above.

- Introduced a calm visual system, smaller headings/labels, a compact desktop sidebar,
  three primary destinations (Today, My learning, Distractions), mobile navigation,
  theme controls and a visible help/feedback link. Operational tools remain available
  without being offered as normal customer tasks.
- Replaced the default Cards experience with a searchable topic library, a shared
  category/goal/level starter builder, a question preview before saving, optional curated
  sets, and a manual question form. Preserved the full editor and existing summary tools
  at `/app/cards/manage`. Removed the duplicated starter builder and fake saved summary
  from that editor.
- Simplified onboarding to four visible steps and reused the same builder. Added French,
  German and everyday-science curated material. Local preview no longer fabricates
  generated question/answer placeholders and does not ask for a pretend password.
- Rebuilt the landing-page interaction and standalone interruption UI. Topic practice
  filters the chosen subject, normal continuation survives telemetry failure, source
  excerpts remain available, and local completion writes the correct outcome.
- Implemented actual future review dates and due-first selection. Practice can revisit
  familiar questions; extension interceptions respect the review schedule. This remains
  an explainable heuristic rather than a validated memory algorithm.
- Added explicit session sources through `20261015231000_consumer_session_sources.sql`.
  Only completed extension sessions count as converted distractions; manual practice,
  onboarding and legacy unknown-origin sessions are excluded. Removed unmeasured saved-time
  claims from the dashboard.
- Simplified site rules with atomic schedule forms, individual weekday selection,
  snooze, pause/resume and removal confirmation. Rule changes notify other hook instances
  so the extension bridge no longer keeps an independently stale list.
- Restored recent study-guide recommendations on revisit, added an actionable practice
  link, and kept raw model/tool diagnostics out of the consumer recommendation view.
- Added password reset/update screens, explicit email-confirmation messaging, onboarding
  redirects for email and Google registration, and corrected protected-route login
  redirects. These need configured Supabase redirects and email delivery to test live.
- Separated React/Supabase vendor bundles and lazy-loaded the editor/operational pages.
  The large-chunk build advisory is resolved. No production timing improvement is claimed.

Verification: 103 tests across 21 files passed, 37 AI-specific tests passed, offline
evals passed 28/28, all seven Edge Function entry points bundled, lint passed, and web
and extension production builds passed. A real headless Chrome walkthrough verified
curated preview/save, topic review, future scheduling, completed session attribution,
schedule persistence, snooze, onboarding, bypass return (with a stubbed destination),
and manual question creation. A separate browser pass checked 37 page/viewport/theme
states with axe: no reported violations, no horizontal overflow at desktop/390px, and
no page errors. These checks are local browser tests, not a live installed-extension test
or a complete accessibility certification.

`scripts/review-product.mjs` reproduces the optional browser review using Chrome and
Playwright/axe installed in `%TEMP%/better-focus-review`. Run the Vite app at port 5175
or set `REVIEW_URL`; use `--flow-only` to run behavior checks without the viewport/audit
matrix. Screenshots are written to `%TEMP%/better-focus-screenshots`.

The implementation work described by the five tranches is present locally. It is not a
claim of deployment or production operation. The full migration chain has not been
applied to hosted Supabase, changed Edge Functions have not been deployed, a real worker
scheduler has not run, and provider-backed tutor/RAG/job calls have not been exercised.
Live model, retrieval-recall and faithfulness baselines do not exist. A real installed
Chrome extension-to-interrupt-to-review run, hosted auth/email checks and payment testing
remain. Account export/deletion, production error monitoring and lifecycle messaging are
also outstanding public-launch work. The exact release checks are tracked in
`docs/HARDENING_CHECKLIST.md` and `docs/COMMERCIAL_PRODUCT_REVIEW.md`.
