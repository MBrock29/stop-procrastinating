# Stop Procrastinating

React, TypeScript, Tailwind, Supabase, and a Chrome Manifest V3 extension working together to turn habit-site visits into a short learning interrupt.

## What it does

- Users manage blocked domains in the web app.
- Users create their own question-and-answer learning cards.
- Users can generate a cheap cached batch of AI cards for a topic and then review them like normal cards.
- The extension caches active blocked domains locally.
- When a blocked domain is visited, the extension redirects the browser to the app’s `/interrupt` route.
- The interrupt route shows one due card, records a confidence rating, and reschedules the card.

## Project shape

- `src/`: React app
- `src/features/auth`: auth provider and session handling
- `src/features/blocked-domains`: blocked-domain data layer and UI hooks
- `src/features/cards`: card CRUD and scheduling logic
- `src/features/interrupts`: interrupt session and review persistence
- `src/features/extension`: app-side bridge that syncs rules to the extension
- `extension/`: Manifest V3 extension source and static assets
- `supabase/migrations/`: SQL schema for blocked domains, cards, interrupt sessions, and reviews
- `supabase/functions/generate-learning-cards`: edge function that calls the LLM once and returns a stored card batch

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Fill in Supabase values if you want real auth/data.

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are missing, the app still runs in demo mode with local-storage-backed auth and data so you can exercise the full flow locally.

4. Optional for AI generation in production:

- set `OPENAI_API_KEY` in your Supabase edge-function secrets
- optionally set `OPENAI_GENERATION_MODEL=gpt-4.1-mini` for direct OpenAI usage
- if you use OpenRouter, set `OPENROUTER_API_KEY` and `OPENROUTER_GENERATION_MODEL=openai/gpt-4.1-mini`

5. Start the app:

```bash
npm run dev
```

6. Build the extension:

```bash
npm run build:extension
```

7. Load the extension in Chrome:

- Open `chrome://extensions`
- Enable `Developer mode`
- Click `Load unpacked`
- Select `extension/dist`

## Supabase setup

Apply the SQL in `supabase/migrations/` to create:

- `blocked_domains`
- `learning_cards`
- `interrupt_sessions`
- `card_reviews`

Each table is protected with row-level security for the signed-in owner.

To enable AI generation with Supabase:

```bash
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set OPENAI_GENERATION_MODEL=gpt-4.1-mini
supabase functions deploy generate-learning-cards
```

If the app is running without Supabase, the AI generator falls back to a deterministic local demo generator so the UI still works for testing.

## Extension sync flow

- The authenticated app shell mounts `ExtensionSyncBridge`.
- Whenever active blocked domains change, the app posts a sync message to the page.
- The extension content script forwards that payload to the background worker.
- The background worker stores:
  - `appBaseUrl`
  - `blockedDomains`
  - `lastSyncedAt`
- The popup reads that status and can request a sync from the currently open app tab.

## Redirect flow

1. User navigates to a blocked domain.
2. Background worker checks the cached rules.
3. If the host matches, the tab is updated to:

```text
/interrupt?site=<hostname>&source=extension
```

4. The app creates an interrupt session.
5. The app loads one due card.
6. The user reveals the answer and rates confidence.
7. The app records a `card_review`, updates scheduling fields on the card, and completes the interrupt session.

## AI card generation flow

1. User opens the cards page and enters a topic such as `mid-senior React interview questions`.
2. The app sends one request to the `generate-learning-cards` edge function.
3. The edge function calls the OpenAI Responses API once and asks for structured JSON output.
4. The returned cards are saved into `learning_cards` with:
   - `source = ai`
   - `generation_topic = <topic>`
   - `is_user_edited = false`
5. From that point on, AI cards use the same review scheduling and interrupt flow as manual cards.

## Scripts

```bash
npm run dev
npm run build
npm run build:extension
npm run build:all
npm run lint
npm run test
```

## Notes

- Browser target is Chrome/Chromium first.
- Domain matching is domain-level, including subdomains.
- v1 is designed to interrupt habits, not to be impossible to bypass.
- The extension currently uses the app origin to avoid redirect loops; it will not redirect when you are already on the app itself.
