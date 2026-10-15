# Architecture

This document describes repository behavior. Supabase migrations and Edge Functions must be deployed before hosted paths exist.

## Application

```mermaid
flowchart TD
  E[Chrome extension] --> I[Learning interrupt]
  I --> W[React web app]
  W <--> P[(Supabase Postgres + RLS)]
  W --> F[Supabase Edge Functions]
  F --> O[OpenAI / OpenRouter]
  P --- V[(pgvector)]
  F --> P
  P --> T[AI telemetry and eval history]
  S[Trusted scheduler] --> Q[Background worker]
  Q --> G[Shared generation handlers]
  G --> P
  G --> O
```

The browser uses a user JWT and RLS. Edge Functions validate that JWT for synchronous requests. Derived data and operational state such as embeddings, generation events, tutor traces, and job transitions are written with the service role through narrowly granted SQL functions where atomicity matters.

## Adaptive tutor

```mermaid
sequenceDiagram
  participant U as User
  participant T as Tutor function
  participant M as Model
  participant D as Application data
  U->>T: Request recommendation
  T->>M: Require learner-state tool use
  M->>T: Tool call
  T->>D: Validated read
  D-->>T: Bounded result
  T->>M: Tool result
  M-->>T: Structured recommendation
  T->>D: Persist run and ordered traces atomically
  T-->>U: Recommendation and compact trace
```

The runtime permits three model rounds and eight total calls. Tool names and argument schemas are closed sets. The first round must call a tool, so the recommendation cannot present uninspected learner state as personalized evidence.

## Retrieval-augmented generation

```mermaid
flowchart LR
  A[User-provided text] --> N[Normalize]
  N --> C[Overlapping chunks]
  C --> E[Embeddings]
  E --> P[(pgvector)]
  Q[Topic] --> QE[Query embedding]
  QE --> R[Owner-scoped cosine retrieval]
  P --> R
  R --> G[Strict grounded generation]
  G --> H[Hydrate chunk IDs and excerpts]
  H --> L[Lexical smoke score]
  H --> S[Cards + citations saved atomically]
```

Model output refers to retrieved positions. The server validates every index, then replaces it with stored chunk identity, excerpt, source title, URL metadata, and similarity. Every card needs at least one citation. Arbitrary URLs are never fetched by the Edge Function.

## Background generation

```mermaid
flowchart TD
  R[Authenticated request] --> P[Sanitize and validate policy]
  P --> I{Idempotency key exists?}
  I -- yes --> X[Return existing job]
  I -- no --> Q[(Queue)]
  Q --> C[Claim with SKIP LOCKED]
  C --> F[Fenced lock token]
  F --> V[Revalidate user, plan, quota, and ownership]
  V --> G[Existing generation handler]
  G --> S[Persist artifact and result]
  G -->|failure| B[Bounded exponential backoff]
  B -->|attempts remain| Q
  B -->|exhausted| D[Dead letter]
  Z[Stale lock recovery] --> B
```

Jobs store `user_id` and a sanitized payload; they never store a browser access token or provider key. A worker secret authenticates the scheduler and an internal service identity selects the target user. The same card, grounded-card, and brief handlers serve synchronous and worker requests, keeping their authoritative generation rules on one path. Completion and failure RPCs require the job ID, worker ID, and current lock token, so an expired worker cannot overwrite a later claim.

## Data ownership

- Browser-managed product tables use owner RLS.
- Mastery is derived by a review trigger; clients cannot edit the aggregate.
- Source chunks and grounded telemetry are browser read-only.
- Feedback uses composite foreign keys so a user cannot attach feedback to another user's card or source.
- Tutor and queue state are owner-readable and service-writable.
- Vector retrieval either derives the browser owner from `auth.uid()` or accepts a user ID only in a service-role-only function.

## Quality signals

Runtime telemetry answers operational questions: requests, status, latency, tokens, known cost, grounding smoke score, tutor tools, and failures. Offline eval reports answer repeatable comparison questions. Correctness, relevance, retrieval recall, and faithfulness remain separate measures; no single runtime score is treated as proof of factual accuracy.
