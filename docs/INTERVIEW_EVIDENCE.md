# Interview evidence

Use these claims with the linked repository evidence. They describe implemented code and local tests, not production scale.

| Defensible claim | Evidence |
| --- | --- |
| I built a bounded tutor that inspects learner state through application tools. | `supabase/functions/adaptive-tutor/index.ts`, `_shared/tutorRuntime.mjs`, and tutor runtime/database tests |
| Tutor calls are traceable. | `ai_tutor_runs`, `ai_tutor_tool_events`, atomic `record_ai_tutor_run`, and `/app/ai-ops` |
| I implemented owner-scoped RAG with pgvector and exact chunk citations. | grounded-source migration, ingestion/generation functions, RAG utility and pgvector database tests |
| I added repeatable model/prompt evaluation. | 28 offline fixtures, 25 live cases, comparison/publish scripts, and manual live-eval workflow |
| I separated slow generation into idempotent jobs with retries and dead letters. | generation-jobs migration, queue/worker functions, Jobs page, and lifecycle tests |
| The worker does not store user JWTs. | sanitized queue payload, relational `user_id`, shared internal identity helper, and credential-payload constraint test |
| I made late worker updates safe. | per-claim `lock_token`, fenced complete/fail RPCs, stale recovery, and stale-token database test |
| I connected user feedback to prompt-quality analysis data. | `ai_card_feedback`, composite owner foreign keys, feedback repository/component, and ownership tests |
| Missing AI cost data is visible. | nullable cost fields, cost coverage in evaluator/AI Ops, and no zero substitution |
| CI catches deterministic AI and integration regressions without provider spend. | `.github/workflows/quality.yml`, `test:ai`, offline evaluator, PGlite tests, and Edge bundle check |

Avoid claims that the queue is enterprise-grade, that the lexical score proves correctness, that live model quality has been established, or that the system has handled production load. The repository does not provide that evidence.

## Suggested walkthrough

1. Start with the extension redirect and review loop so the product need is clear.
2. Show structured generation policy and telemetry.
3. Trace one tutor tool call into persisted learner data.
4. Trace one cited card from pgvector retrieval through hydrated citations.
5. Demonstrate a duplicate queue request and a fenced stale-lock test.
6. Finish with eval comparison and the explicit hosted-validation boundary.
