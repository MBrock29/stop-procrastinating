# Portfolio case study

## Product problem

Website blockers create friction but often leave a blank moment. Better Focus uses that moment for one small learning action. The Chrome extension redirects a configured habit site into the web app, where the learner reviews a due card and records confidence before deciding what to do next.

## Engineering progression

The initial product already had authentication, cards, review scheduling, extension syncing, billing, plan-aware AI packs, BYOK, and briefs. The work in this repository extends those foundations without replacing working flows.

The first change made AI changes measurable. Card calls now carry request and prompt identifiers, latency, tokens, known cost, and failure state. A 28-case offline evaluator checks parser and quality-rule regressions, while 25 opt-in topics support real model comparisons. Topic mastery is derived from actual reviews with an explainable formula rather than generated learner data.

The second change added one bounded tutor. It must inspect stored learner state through validated tools before producing a recommendation. Runs and ordered tool calls are persisted, which makes behavior reviewable in the AI Ops page.

The third change grounded cards in user-provided material. Text is normalized, chunked, embedded, and stored in pgvector. Retrieval is owner-scoped, citation indexes are checked, and cards retain exact chunk IDs and excerpts. URL fields remain metadata to avoid an SSRF-capable fetcher.

The fourth change added human feedback and slow-work isolation. Feedback is tied to owner-consistent cards and sources. Generation jobs are idempotent, service-owned, retryable, stale-lock recoverable, and fenced against late workers. Workers store user identity in a relational column and never persist user JWTs.

## Decisions and trade-offs

- **One tutor instead of multiple agents.** The product needs a study recommendation, not open-ended orchestration. Bounded tools and rounds improve cost control and testability.
- **Deterministic checks plus explicit gaps.** Schema, duplicate, citation, and lexical checks are useful regression signals. They do not substitute for correctness or faithfulness evaluation.
- **Shared handler path for jobs.** The worker calls the existing generation handlers with an internal service identity. This avoids a second implementation of plan routing and quotas while keeping browser credentials out of the queue.
- **Embedded Postgres tests.** PGlite executes real migrations, constraints, functions, pgvector queries, and RLS locally. Hosted Supabase still needs a deployment smoke test because PGlite does not reproduce the entire platform.
- **Manual live evals.** The default CI suite has no model cost or secret dependency. A separately confirmed workflow runs the 25 live cases and saves its report as an artifact.

## Evidence

The repository contains runtime tests, database ownership tests, queue lifecycle tests, extension redirect tests, Edge Function bundle checks, production builds, and CI definitions. `docs/IMPLEMENTATION_PROGRESS.md` records the local validation boundary and avoids production claims.

## Remaining environment work

Apply the complete migration chain to a disposable Supabase project, deploy each Edge Function, configure a scheduler, run the live eval suite on a dedicated account, and execute a real Chrome navigation through interrupt completion. Retrieval recall and model faithfulness also need labeled test material before model-quality claims can be made.
