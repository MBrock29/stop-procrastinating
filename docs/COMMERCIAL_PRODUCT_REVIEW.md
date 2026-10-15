# Better Focus: commercial product review

Reviewed 15 October 2026, with landing/default-schedule refinements on 16 October,
against the actual local application, browser screenshots,
source, and current competitor product pages. This is a product assessment and a
record of implemented changes, not evidence of product-market fit or hosted operation.

## Commercial judgement

Better Focus has a plausible reason to exist: it makes the moment someone opens a
distracting website useful. The strongest product is a lightweight habit intervention
with personally relevant learning attached. Its value depends on the interruption
feeling worthwhile often enough that people leave the extension installed.

The previous implementation had enough features for an early test but made the user
do too much work. Its shell repeated marketing copy on every page, the card screen
contained several competing creation workflows, and the dashboard presented estimated
saved time without observing how long the user would otherwise have spent scrolling.
Some advertised learning behavior also needed correction underneath the design.

My recommendation is to sell a small, dependable daily outcome. Do not build a full
study workspace, digital wellbeing suite, or general AI assistant before repeated use
has been demonstrated. The likely customer promise is: “Help me catch an automatic
visit, practise something I actually care about, and get on with my day.”

## What prospective users need

At signup they need to understand the mechanism, recognise a learning goal of their
own, see the quality of the questions, and get one real interruption working. They
should not need to understand packs, providers, quotas, prompts, or billing tiers to
experience the product.

During the day they need fast questions, predictable boundaries, a way to continue,
and permission to take a break. A learner who uses YouTube for work must be able to
snooze a rule. A person who knows a question should not see it on every navigation.
If everything is already reviewed, opening a distracting site should not manufacture
another compulsory study task.

After a week they need evidence of useful practice and a way to improve relevance:
edit a poor card, add a new subject, use their own notes, and revisit a difficult topic.
Their dashboard should help them decide what to do next rather than require them to
interpret an analytics report.

## Comparable products and implications

| Product | Observed product emphasis | Implication for Better Focus |
| --- | --- | --- |
| [one sec](https://one-sec.app/) | Interventions around app opening, including intention tracking | The moment of interruption and user agency matter more than the size of a dashboard. Keep an intentional pause optional and short. |
| [Freedom](https://freedom.to/) | Site/app blocking, recurring schedules, blocklists and optional locked sessions | Predictable schedules and escape controls are basic expectations. Better Focus should not imply that its desktop Chrome extension provides Freedom's cross-device coverage. |
| [RemNote](https://www.remnote.com/) | Notes, source material, flashcards, spaced repetition and broader study tools | Personal material and useful review timing have clear learning value. Better Focus can adopt those principles without copying an entire note editor or exam planner. |

These pages support the feature comparisons. They do not establish that those
features cause retention, or that Better Focus will inherit their commercial results.
The implementation choices below are my judgement from the code and user journey.

## Feature decisions

| Feature | Decision | Reason |
| --- | --- | --- |
| One short learning interruption | Core, default | Delivers the distinctive outcome without becoming another distraction. |
| Topics shaped by the user's goal | Core | Generic Spanish/programming options cannot represent everyone's interests. |
| Question preview before saving | Core | A relevant title is insufficient; users must be able to judge the actual questions. |
| Confidence-based review timing | Core, corrected | Familiar cards should get space and difficult cards should return sooner. |
| Per-site schedule, snooze, pause | Core, simplified | People need different boundaries during work, rest and legitimate site use. |
| Three-question and intentional modes | Secondary choices | Useful alternatives; six equally prominent modes create unnecessary decisions. |
| Answer-first/adaptive/soft modes | Advanced compatibility | Retained for users who choose them; avoid suggesting sophisticated behavioral adaptation that is not implemented. |
| Learning from notes, with source excerpts | Pro differentiator | Connects the product to a user's real goal rather than generic question generation. |
| Study guide | Contextual assistance | Helpful when someone asks what to practise; does not need its own main navigation item. |
| Summaries and deeper sets | Secondary, preserved | Useful after material exists; they should not dominate an empty learning screen. |
| Card editing, archiving and organisation | Dedicated editor | Important control for motivated users; distracting as the default landing experience. |
| Generation jobs, providers, models, AI operations | Developer/operational | Keep the architecture; ordinary users should not administer it. |
| Streaks, rewards, leaderboards, social feed | Do not add now | Would increase product complexity and risk rewarding app engagement over leaving distraction behind. |
| Timers, ambient sound, calendars, more agents | Defer | Established products cover these; they do not yet strengthen this product's main loop. |

## Implemented design changes

The interface now uses a calmer green and neutral palette, smaller labels, restrained
borders and shadows, a consistent icon set, and more deliberate spacing. A compact
desktop sidebar and mobile navigation replace the large repeated marketing header.
The three primary destinations are Today, My learning, and Distractions. Settings and
support remain available; developer tools are disclosed only to eligible accounts.

The landing page demonstrates a real clickable question/answer/review/completion
sequence. Visitors can try French, technology, and everyday science. Its buttons have
actual behavior, the FAQ explains desktop Chrome and import limitations, and public
pricing avoids claiming unlimited generation or unmeasured benefits.

Today now has one useful next action, an actual seven-day conversion count and chart,
a short activation checklist, topic summaries, and a contextual study suggestion.
Unmeasured “time reclaimed” has been removed from the main interface. Confidence is
described as a self-report signal rather than a proven mastery or correctness score.

My learning replaces the former long Cards screen with a topic library. A shared
starter builder serves both the library and onboarding: optional category/subcategory,
the user's goal, starting level, focused starter choices, and an expandable question
preview before saving. Curated sets are optional, with French, German and everyday
science added alongside the existing subjects. The old full editor and summaries are
preserved at `/app/cards/manage`.

Onboarding is four visible steps: choose distractions, add learning, connect Chrome,
and try a pause. Users can bring existing questions or defer material/extension setup.
The dashboard then shows exactly which activation steps remain. Preview generation
uses the normal allowance; it does not secretly generate three full packs at once.

The interruption is a standalone, focused screen. It prompts recall before revealing
the answer, uses clear review choices, displays citations when available, and ends
with a short acknowledgement. A normal continuation remains available. Review-saving
failure cannot prevent returning to the user's intended website.

Distractions now use compact site summaries. Editing days/times/intensity is disclosed
under preferences and saved as one validated change. Weekends and individual days
are selectable. Snooze, pause/resume, and removal confirmation remain direct actions.
Connected rule consumers refresh after mutations rather than overwriting a newer
schedule from stale component state.

## Reliability and trust corrections

- Ratings now produce real review dates: need practice in ten minutes, almost there
  in one day, and got it in three days with longer intervals for repeated familiarity,
  bounded at thirty days. This is an explainable heuristic, not a validated memory model.
- Due questions are prioritised. Intercepted visits respect the due schedule, while
  an explicit practice request permits extra review. A topic practice link now filters
  that topic instead of silently opening another subject.
- Session origin is persisted. Practice, onboarding, legacy/unknown and real extension
  visits are distinguishable. Only completed extension visits count as converted
  distractions; historical origins are not guessed.
- Local completion now records the completed outcome. StrictMode re-execution does
  not intentionally create multiple sessions for the same screen load.
- Demo mode is labelled local preview. It uses actual curated questions and user data;
  arbitrary generated placeholder answers have been removed. Personalised generation
  requires the connected backend. Local sign-in does not ask for a pretend password.
- Auth redirects preserve onboarding for Google and email signup. Email confirmation
  gets an explicit state instead of an apparent successful signup followed by another
  login screen. Password reset and update pages use the existing Supabase client.
- Diagnostics, source retrieval similarity and lexical overlap are not presented as
  learning quality or accuracy to customers. Telemetry failures cannot break onboarding.
- The editor and operational pages load separately. Vendor bundles are separated so
  a minor editor change does not require shipping every tool as part of one application
  chunk. No load-time improvement is claimed without a measured production comparison.

## Pricing and paid value

Keep Free and one Pro offer. Free should demonstrate a real end-to-end habit loop,
including schedules and easy continuation. Charging for an escape hatch would work
against trust. Pro should earn its price through personally useful material, contextual
guidance, summaries and a larger generation allowance.

The current configured prices have been preserved. The earlier proposed £4.99 monthly
and £39.99 yearly remain hypotheses, not verified willingness to pay. Do not change
marketing numbers independently of the actual Stripe catalogue, taxes, refunds and
existing subscribers. Legacy Pro and BYOK entitlements need explicit migration
decisions before calling them equivalent to every capability in the new public offer.

Measure cost per activated user and retained paid user, not just cost per model call.
Include ingestion/embeddings, failed calls, tutor runs, retained storage, payment fees
and support. A premium personal-material feature can cost more for an inactive user
who uploads many documents than for a frequent learner who mostly reviews saved cards.

## Commercial risks to test

1. **Interruption fatigue:** even useful questions can become irritating if there are
   too many. Measure actual bypass/pause behavior and ask why before adding friction.
2. **Context switching:** learning may become another way to avoid work. Keep the
   default to one question and make “back to my day” a successful outcome.
3. **Content relevance and accuracy:** incorrect or repetitive cards can destroy the
   value proposition. Preview, editing, citations and feedback help; they do not prove
   that generated explanations are correct.
4. **Desktop-only coverage:** the customer can pick up their phone instead. State the
   supported platform honestly and recruit desktop-heavy learners initially.
5. **A weak paying reason:** enjoying a free blocker is not the same as paying for
   learning. Test personal notes and recommendations with real users before expanding
   the paywall or generating a bigger catalogue.
6. **Acquisition:** there is no evidence yet of a repeatable distribution channel.
   Start with one recruiting channel and relevant learning goals instead of marketing
   to everyone who procrastinates.

## Public-test plan

Recruit 20–30 desktop Chrome users with an active learning goal. Developers preparing
for interviews are a practical first recruiting segment, but onboarding must accept
other subjects. Observe the first setup in person or by consented screen share.

Define activation as a completed question from a genuine extension interception.
Keep an onboarding test and an intentional practice session separate. Track the
signup-to-extension funnel, time to first real interruption, completion/bypass rate,
site pause behavior, later-day and day-seven extension usage, source adoption, and
actual upgrade attempts. Treat chart values as observed events, not guaranteed screen
time saved. A missing event is not proof that a person uninstalled the extension.

Ask three questions after a week: Was the learning useful? Did the interruption become
annoying? What would you miss if it disappeared? If people disable it, prioritise the
interruption and content relevance. If they keep it but do not pay, investigate paid
value and pricing. If they never activate, investigate installation and onboarding.

## Release priorities and boundaries

Adding `.env` connects browser authentication; it does not automatically apply schema
changes, deploy functions or configure their secrets. Apply the migrations in order,
including `20261015231000_consumer_session_sources.sql`, and validate against a real
Supabase environment before release. Also apply `20261016090000_default_always_on_protection.sql`
for the new all-day, every-day default; existing custom schedules are preserved. Configure auth redirect allowlists for onboarding
and `/update-password`. Password recovery and confirmation also require working email
delivery. The flow follows [Supabase's password-auth guidance](https://supabase.com/docs/guides/auth/passwords).

Before taking public payments, complete hosted Stripe checkout/cancellation testing,
an end-to-end Chrome extension test, a real generation/source/tutor smoke test,
error monitoring with personal-data redaction, and account export/deletion with billing
and retention handling. Account export/deletion and lifecycle email automation are
still unimplemented; a help link is not a substitute for those flows. Direct PDF import,
cross-device blocking, an empirically validated scheduler, and measured uninstall rate
are also outside the implemented claim.

The exact automated and browser results are recorded in `IMPLEMENTATION_PROGRESS.md`.
