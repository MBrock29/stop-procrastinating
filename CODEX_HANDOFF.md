# CODEX_HANDOFF.md

# Better Focus — Codex Handoff

## Objective

Continue development of **Better Focus** directly inside the real repository.

Repository:

```text
MBrock29/stop-procrastinating
```

The project began as a productivity app / Chrome extension that redirects visits
to distracting websites into short learning interruptions. It has since been
designed into a stronger Applied AI / AI Product Engineering portfolio project.

The goal now is **not** to keep adding buzzword-heavy AI features. The priority is
to integrate the existing planned work correctly, harden it, test it, and make
the repository credible to an experienced engineer reviewing it.

---

# Important working rules

Before changing anything:

1. Inspect the current repository structure.
2. Inspect the existing implementation of the relevant feature.
3. Do not blindly apply patch files.
4. Reconcile every proposed change with the actual codebase.
5. Prefer refactoring existing code over duplicating logic.
6. Keep existing working functionality intact.
7. Run validation after every logical tranche.
8. Fix failures before moving to the next tranche.
9. Do not invent product metrics, users, revenue, performance claims, or
   production usage that cannot be supported by the repository.
10. Prefer explainable engineering decisions over unnecessary framework
    complexity.

After each tranche, run:

```bash
npm run lint
npm test
npm run build
npm run build:extension
```

If `build:all` is available and appropriate:

```bash
npm run build:all
```

When AI-specific tests are integrated:

```bash
npm run test:ai
```

---

# Existing project baseline

The existing project already contains substantial functionality.

Known stack:

- React 18
- TypeScript
- Vite
- Tailwind
- React Router
- Supabase
- Chrome Manifest V3 extension
- Vitest
- React Testing Library
- Stripe-related billing functionality
- OpenAI / OpenRouter AI generation paths

Existing product behaviour includes:

- user authentication
- blocked website management
- Chrome extension rule syncing
- website interception / redirect
- learning cards
- confidence-based review scheduling
- interrupt sessions
- AI-generated learning packs
- local/demo fallbacks
- user tiers / AI access controls
- BYOK support
- billing
- learning briefs
- learning insights

Existing AI generation code already includes production-oriented controls such as:

- model routing
- plan limits
- request cooldowns
- cost caps
- token usage capture
- generation event logging
- structured model output
- duplicate-question prevention
- BYOK credentials

Do not replace these blindly.

---

# Architecture direction

The desired end-state is a production-oriented AI product that demonstrates:

- structured LLM outputs
- multiple providers/models
- model routing
- token/cost controls
- BYOK
- AI observability
- automated evals
- prompt/model versioning
- adaptive tool calling
- learner mastery state
- RAG
- embeddings
- pgvector
- citations / grounding
- human feedback
- async jobs
- idempotency
- retries/backoff
- dead-letter handling
- secure server-side policy enforcement
- CI regression gates
- clear architecture documentation

The project should **not** claim multi-agent complexity unless there is a real
product need for it.

The preferred agent architecture is one bounded, measurable adaptive tutor that
can call application tools.

---

# Integration bundles

Five implementation bundles were prepared in ChatGPT.

Place them somewhere inside or beside the repository for reference, ideally:

```text
_ai-showcase-reference/
  v1/
  v2/
  v3/
  v4/
  v5/
```

They are reference implementations, not authoritative source code.

Codex should inspect them and integrate the concepts into the existing codebase.

---

# Tranche 1 — Evals, observability, mastery

Bundle:

```text
better-focus-ai-showcase-v1.zip
```

Intended additions:

## AI eval system

Introduce a repeatable card-generation evaluation harness.

Initial metrics include:

- schema compliance
- card count
- duplicate freedom
- concise answers
- low-value pattern detection
- correctness/relevance hooks
- latency
- token usage
- cost

The eval system should support future comparison between:

- models
- prompt versions
- provider configurations

## AI observability

Extend AI generation telemetry with concepts such as:

- request ID
- prompt version
- latency
- status
- model
- provider
- tokens
- estimated cost

Do not duplicate telemetry already present in the project.

Instead, inspect existing:

```text
ai_generation_events
generate-learning-cards
```

and extend them cleanly.

## Topic mastery

Introduce persisted learner mastery by topic.

Potential fields:

- topic
- attempts
- know count
- semi-confident count
- not-confident count
- mastery score
- last reviewed
- next recommended review

The mastery heuristic should remain explainable.

---

# Tranche 2 — Adaptive tutor + tool calling + AI Ops

Bundle:

```text
better-focus-ai-showcase-v2.zip
```

## Adaptive tutor

Add one bounded tool-using tutor.

Potential tools:

```text
get_topic_mastery
get_due_cards
get_recent_weaknesses
get_recent_learning_briefs
```

The tutor should:

1. inspect actual learner state
2. choose relevant application tools
3. receive tool results
4. produce a structured study recommendation
5. persist the tutor run
6. persist tool traces

Recommended final output shape:

```ts
{
  headline: string
  focusTopic: string
  reason: string
  actions: string[]
  estimatedMinutes: number
  confidence: 'high' | 'medium' | 'low'
}
```

Keep the number of tool rounds bounded.

Do not invent learner data.

## AI Ops

Add an internal AI operations view showing useful production metrics such as:

- request count
- success rate
- failures
- latency
- p95 latency
- input/output tokens
- cost
- tutor runs
- tutor tool calls
- latest eval score

---

# Tranche 3 — RAG + citations

Bundle:

```text
better-focus-ai-showcase-v3.zip
```

Add source-grounded learning generation.

Desired pipeline:

```text
source
→ normalize
→ chunk
→ embed
→ pgvector
→ query embedding
→ semantic top-k retrieval
→ grounded generation
→ citation hydration
→ grounding/eval signal
```

## Learning sources

Potential source types:

- pasted text
- notes
- URL-derived text
- document-derived text

Important:

Do not blindly fetch arbitrary URLs inside an Edge Function.

For URL/PDF workflows, use a safe extraction layer rather than creating an SSRF
surface.

## Storage

Conceptual tables:

```text
learning_sources
learning_source_chunks
grounded_generation_events
```

Use `pgvector`.

Every source and chunk must remain user-owned through RLS / explicit ownership
checks.

## Grounded cards

Generated cards should retain:

- source ID
- cited chunk IDs
- citation excerpts
- grounding score / eval signal

Every answer must cite at least one retrieved chunk.

## Runtime grounding score

A cheap lexical overlap score can exist as a smoke-test metric.

Do **not** treat it as proof of factual correctness.

A proper offline grounding suite should separately evaluate:

- retrieval recall
- citation validity
- faithfulness
- coverage
- duplicates
- latency
- cost

---

# Tranche 4 — Feedback, eval comparison, async jobs

Bundle:

```text
better-focus-ai-showcase-v4.zip
```

## Human AI feedback

Add structured feedback on generated cards:

```text
useful
incorrect
too_easy
too_hard
weak_citation
```

Persist this signal for later prompt/eval analysis.

## Prompt/model comparison

Allow candidate configurations to be compared on:

- average score
- pass rate
- latency
- cost

The point is to demonstrate measured model selection, not subjective selection.

## Background generation jobs

Introduce asynchronous generation for expensive work.

Desired job properties:

```text
id
user_id
idempotency_key
job_type
payload
status
attempt_count
max_attempts
next_attempt_at
locked_at
locked_by
result
error_message
created_at
updated_at
completed_at
```

Desired states:

```text
queued
processing
succeeded
failed
dead_letter
```

Use safe claiming such as:

```sql
FOR UPDATE SKIP LOCKED
```

Support:

- idempotency
- retries
- exponential backoff
- dead-letter state
- result persistence

---

# Tranche 5 — Hardening + presentation

Bundle:

```text
better-focus-ai-showcase-v5-hardening.zip
```

This tranche should receive high priority once v1-v4 are integrated.

## Server-side generation policy

Extract shared policy / ownership checks.

The synchronous HTTP handlers and background workers should **not** maintain two
separate sets of generation rules.

Shared logic should cover:

- user ownership
- plan tier
- card-count limits
- grounded-generation entitlement
- retry limits
- source ownership

## Important worker hardening

Do not persist user access tokens inside queued job payloads.

Instead, the hardened architecture should work roughly like:

```text
job stores user_id + payload
worker uses service role
worker explicitly validates ownership + plan policy
worker invokes shared generation service
```

This is safer and avoids depending on short-lived user JWTs.

## Stale worker recovery

If a worker dies after claiming a job, allow old `processing` locks to be
recovered after a threshold.

## AI regression CI

Add GitHub Actions quality checks:

```text
npm ci
npm run lint
npm test
npm run build:all
```

Optionally run live AI evals only when repository configuration enables them.

Example gate dimensions:

- minimum average score
- minimum pass rate
- minimum grounding rate
- maximum eval cost

Do not enable expensive live evals on every commit until a stable baseline and
secrets exist.

## RAG tests

Extract pure RAG utilities where possible:

- source normalization
- chunking
- citation index validation
- lexical grounding score

Add deterministic Vitest coverage.

Later add:

- local Supabase integration tests
- Edge Function contract tests
- extension → interrupt → review end-to-end coverage

---

# Presentation work

The original README mostly describes the blocker/card product.

Once v1-v5 are actually integrated and tested, replace it with a stronger public
README.

The project should be presented first as:

> Better Focus — turn distraction into learning.

Then explain the AI architecture rather than leading with AI buzzwords.

Suggested README sections:

1. product overview
2. screenshots/demo
3. key product flow
4. AI system
5. architecture
6. reliability/evals
7. local development
8. Chrome extension setup
9. technical decisions
10. future work

---

# Architecture documentation

Add:

```text
docs/ARCHITECTURE.md
docs/PORTFOLIO_CASE_STUDY.md
docs/HARDENING_CHECKLIST.md
docs/INTERVIEW_EVIDENCE.md
```

The architecture document should include Mermaid diagrams for:

## Overall application

```text
Chrome extension
       |
       v
learning interrupt
       |
       v
React app <--> Supabase/Postgres
                  |
                  +--> Edge Functions
                  |       |
                  |       +--> OpenAI/OpenRouter
                  |
                  +--> pgvector
                  |
                  +--> AI telemetry/evals

Background worker
       |
       v
Shared generation services
```

## Adaptive tutor

```text
user
→ tutor
→ model
→ tool request
→ application data
→ tool result
→ model
→ structured recommendation
```

## RAG

```text
source
→ chunking
→ embeddings
→ pgvector
→ retrieval
→ grounded generation
→ citations
→ eval
```

## Background generation

```text
request
→ idempotency check
→ queue
→ worker claim
→ policy validation
→ shared generation service
→ success

failure
→ exponential retry
→ max attempts
→ dead-letter
```

---

# Interview positioning

Every claim should be defensible from code.

Good framing:

> I built a bounded adaptive tutor that can inspect learner state through
> application tools. Tool calls are persisted and observable.

Good framing:

> I implemented RAG over user-provided learning material with pgvector retrieval
> and citations to the exact source chunks.

Good framing:

> I added an eval harness so model and prompt changes can be compared on quality,
> latency and cost.

Good framing:

> I separated slow AI generation into idempotent background jobs with retries
> and dead-letter handling.

Avoid:

> I built an enterprise-scale multi-agent system.

Avoid:

> The grounding score proves factual correctness.

Avoid:

> The queue is enterprise-grade.

The goal is credible engineering, not inflated language.

---

# Product / CV context

This project is intended to support applications for roles such as:

- AI Product Engineer
- Applied AI Engineer
- Full-Stack AI Engineer
- Product Engineer — AI
- Frontend / Product Engineer on AI products

The strongest positioning is:

- strong frontend/product foundation
- increasingly capable backend/system design
- production-oriented AI application engineering

Do not position this as ML research or model-training work.

---

# Recommended execution order

## Phase 1 — Understand current state

Inspect:

```text
README.md
package.json
src/types/domain.ts
src/router.tsx
src/ui/AppShell.tsx
src/features/cards/
src/features/insights/
src/features/ai-access/
src/features/briefs/
src/features/billing/
src/features/interrupts/
supabase/functions/
supabase/migrations/
```

Run the project before making substantial changes.

Record current baseline:

```text
lint
tests
build
extension build
```

## Phase 2 — Integrate v1

Focus on:

- eval harness
- generation telemetry
- mastery state

Validate.

## Phase 3 — Integrate v2

Focus on:

- tutor
- tool calling
- AI Ops

Validate.

## Phase 4 — Integrate v3

Focus on:

- sources
- embeddings
- pgvector
- retrieval
- citations
- grounding telemetry

Validate.

## Phase 5 — Integrate v4

Focus on:

- human feedback
- eval comparison
- async jobs

Validate.

## Phase 6 — Apply v5 hardening

Refactor shared generation logic before considering the worker complete.

Remove any persisted-user-JWT approach.

Add:

- CI
- tests
- stale-lock recovery
- docs
- AI Ops trends

Validate.

## Phase 7 — Presentation

Only after features are genuinely integrated:

- replace README
- add Mermaid diagrams
- add case study
- improve UI labels and empty/error/loading states
- capture screenshots
- check mobile/responsive layout
- verify demo mode remains useful

---

# Definition of done

The project is not done merely because the code compiles.

A strong completion state is:

## Engineering

- lint passes
- TypeScript build passes
- tests pass
- extension builds
- migrations are internally consistent
- Edge Functions share generation logic where appropriate
- no user JWTs persisted in background jobs
- RLS / ownership checks are clear
- retry/dead-letter flow is testable
- source-grounded generation retains citations
- adaptive tutor tool calls are traceable

## AI quality

- at least 25 stable eval fixtures
- baseline metrics recorded
- prompt/model comparison works
- citation validity checked deterministically
- grounding/faithfulness eval path exists
- AI quality regression can be gated in CI

## Product

- existing blocking/interrupt flow still works
- AI features have loading/error/empty states
- demo mode still works where expected
- the project is understandable without reading every source file

## Presentation

- public README accurately reflects implemented functionality
- architecture diagrams exist
- portfolio case study exists
- screenshots/demo are polished
- interview claims map directly to code

---

# Final instruction to Codex

Treat the five bundles as design/reference material.

Do not blindly copy them into the repository.

Your task is to turn the **real existing Better Focus codebase** into the intended
end-state while preserving quality and avoiding duplicate architecture.

When a bundle conflicts with existing code, prefer the better existing design
and adapt the tranche concept around it.

When a proposed implementation is unsafe or brittle, improve it rather than
preserving it for compatibility.

Prioritize, in order:

1. correctness
2. security
3. maintainability
4. testability
5. observability
6. portfolio clarity
7. new features

Before making large architectural changes, briefly state what you found and what
you intend to change.

Then proceed with implementation.
