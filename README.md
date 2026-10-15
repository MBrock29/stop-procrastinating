# Better Focus

**Turn distraction into learning.** Better Focus pairs a React web app with a Chrome Manifest V3 extension. When a configured site opens, the extension redirects the visit into a short learning interruption: answer one due card, record confidence, and continue with intent.

The repository also explores production-oriented AI product engineering: structured card generation, plan and cost controls, a bounded tool-using tutor, source-grounded cards with citations, observable model calls, deterministic evals, human feedback, and an idempotent background queue.

## Product flow

1. Choose distracting sites and a learning goal during a four-step setup.
2. Preview a personalised or ready-made learning set before adding it to My learning.
3. The app syncs active site schedules and snooze state to the extension.
4. A matching navigation redirects to `/interrupt` with the original URL.
5. The learner recalls an answer and rates it; familiar cards get longer review intervals.
6. Today reports completed extension interruptions separately from manual practice.

Without Supabase variables, the core web flow runs in local demo mode. Hosted AI, RAG, the tutor, feedback, and async jobs require Supabase and server secrets.

Local preview uses real curated learning sets and supports your own questions. It does
not fabricate generated answers. The preview study guide uses a deterministic summary
of local reviews; model-backed recommendations require the connected backend.

See the [commercial product review](docs/COMMERCIAL_PRODUCT_REVIEW.md) for feature
decisions, competitor research, commercial risks, and the release priorities. The full
question editor and existing summary tools remain at `/app/cards/manage`.

## AI system

- **Card generation:** OpenAI or OpenRouter, strict JSON schemas, provider/model routing, BYOK, monthly limits, cooldowns, cost caps, token usage, and duplicate checks.
- **Adaptive tutor:** one bounded agent with up to three tool rounds and eight calls. It can inspect mastery, due cards, weak reviews, and recent briefs before returning a structured study recommendation.
- **Grounded generation:** user-provided text is normalized, chunked, embedded, stored in pgvector, retrieved by cosine distance, and cited by chunk ID and excerpt. The lexical overlap score is a smoke test; it does not establish factual correctness.
- **Quality and observability:** request IDs, prompt versions, latency, tokens, known estimated cost, persisted tutor traces, 28 offline evaluator fixtures, and 25 opt-in live cases. Saved live reports can compare score, pass rate, latency, and cost coverage.
- **Async generation:** browser requests enter a service-owned queue. Workers use no persisted user JWT, claim with `FOR UPDATE SKIP LOCKED`, use fenced locks, retry with bounded exponential backoff, recover stale locks, and dead-letter exhausted jobs.

See [Architecture](docs/ARCHITECTURE.md), [case study](docs/PORTFOLIO_CASE_STUDY.md), [hardening checklist](docs/HARDENING_CHECKLIST.md), and [interview evidence](docs/INTERVIEW_EVIDENCE.md).

## Repository map

| Path | Purpose |
| --- | --- |
| `src/` | React application and feature repositories |
| `extension/` | Chrome extension background, content, popup, and redirect logic |
| `supabase/migrations/` | Postgres schema, RLS, pgvector, telemetry, and queue functions |
| `supabase/functions/` | Authenticated generation, tutor, ingestion, queue, and worker endpoints |
| `evals/` | Stable offline fixtures and opt-in live topics |
| `tests/database/` | PGlite migration, RLS, ownership, atomicity, and queue tests |

## Local development

Requirements: Node 20+, npm, and Chrome/Chromium for the extension.

```bash
npm ci
cp .env.example .env
npm run dev
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` enable real authentication and data. Keep service-role, provider, encryption, Stripe, and worker secrets outside `VITE_*` variables.

Run the same local quality sequence as CI:

```bash
npm run quality
```

The normal CI suite is offline. Live model evals require a dedicated test account and are manual because they make 25 provider calls, consume quota, and incur cost. See [eval documentation](evals/README.md).

## Supabase and Edge Functions

Apply migrations in filename order, then deploy the functions used by your environment. AI paths need the standard Supabase URL/anon/service-role secrets and the relevant provider keys. Async processing additionally needs a strong `GENERATION_WORKER_SECRET`; call `process-learning-generation-job` from a trusted scheduler with that value in `x-worker-secret` and the project anon key as the normal Supabase gateway bearer token. The worker secret, rather than the public anon key, authorizes queue processing.

The worker invokes the same generation handlers used by synchronous requests through a service-authenticated internal identity. Those handlers still enforce plan, quota, ownership, card-count, and source rules. Queue payloads contain sanitized product input only.

No hosted migration, deployment, provider call, retrieval-quality baseline, or production-load result is asserted by this repository.

## Chrome extension

```bash
npm run build:extension
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`. The extension caches the app origin and active domains, avoids redirect loops on the app itself, and includes the original destination as `returnUrl`.

## Technical decisions

- A single bounded tutor makes tool use measurable and auditable without unnecessary multi-agent coordination.
- RLS protects browser reads and writes; service-only functions handle derived telemetry, chunks, tutor traces, and queue state.
- Unknown cost stays `null`, so coverage is visible and missing data is never reported as zero.
- URLs on learning sources are citation metadata. Edge Functions do not fetch arbitrary URLs.
- Queue status is operational state, not a claim of distributed or enterprise scale.

## Current evidence and limits

Vitest covers UI-independent logic, extension redirects, Edge parsing/policy helpers, and embedded Postgres migrations. CI also bundles Edge Function entry points and builds both artifacts. Full hosted Supabase, live LLM/embedding, browser interaction, and extension-to-review end-to-end checks remain environment-level validation work; see the hardening checklist for the exact boundary.
