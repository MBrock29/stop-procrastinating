# Better Focus — Product, UX, Pricing & Commercial Direction Handoff

## Purpose

This document summarises the recommended **commercial, product, UX and pricing changes** for Better Focus.

It is intended for Codex to use as a product-direction reference **after or alongside the v1–v5 engineering integration**.

The key principle is:

> Better Focus should not become a technically impressive AI portfolio project that is confusing or overbuilt for normal users.

The technical AI architecture should remain strong underneath, but the public product should feel extremely simple.

---

## 1. Product positioning

### Current problem

The product can currently be described as:

> Website blocker + learning cards + AI generation

That is technically accurate, but not the strongest commercial positioning.

It risks making Better Focus sound like:
- another blocker
- another flashcard app
- another AI wrapper

### Recommended positioning

The main proposition should become:

> **Turn distraction into learning.**

The product should be framed around one core behavioural loop:

```text
impulse to procrastinate
→ Better Focus interrupts
→ user learns something useful
→ user decides whether to continue to the distracting site
```

The browser blocker is the mechanism.

The AI system is infrastructure.

The **learning outcome** is the customer benefit.

---

## 2. Recommended hero proposition

The landing page should immediately explain the product in concrete terms.

### Headline

> **Stop doomscrolling. Learn something instead.**

### Supporting copy

> Better Focus intercepts distracting websites and gives you a 30-second learning challenge before you continue.

### Primary CTA

> **Add to Chrome — Free**

### Visual demo

Show the interaction directly:

```text
reddit.com

↓

Wait — quick one first

What does HTTP 429 mean?

[Show answer]

↓

Too easy · Got it · Need practice

↓

[Continue to Reddit]   [Go back to work]
```

The product should be understandable in 5–10 seconds without reading technical explanations.

---

## 3. Landing page redesign

The public homepage should feel like a consumer product, not an internal dashboard or technical demo.

Recommended order:

### Section 1 — Hero
- clear headline
- one-line explanation
- Add to Chrome CTA
- visual/demo animation

### Section 2 — How it works

Reduce the current explanation to three simple steps.

#### 1. Pick your distractions
Examples:
- Reddit
- YouTube
- X
- Instagram
- news sites

#### 2. Pick what you want to learn
Examples:
- Spanish
- React
- interview questions
- university notes
- professional certifications

#### 3. Turn impulses into practice

When the user instinctively visits a distracting site, Better Focus gives them a quick learning challenge first.

### Section 3 — Example use cases
Show concrete outcomes:
- Learn Spanish while breaking Reddit habits
- Reinforce React interview knowledge during work
- Review university notes instead of doomscrolling
- Prepare for AWS / professional certifications in small bursts

### Section 4 — Personalisation
Explain that Better Focus gets smarter over time:

> It learns what you struggle with and brings those topics back more often.

### Section 5 — Bring your own material
Explain that users can upload or paste what they actually need to learn.

### Section 6 — Results / social proof
Only once real data exists.

Example:

> 12,481 distractions turned into learning moments this week.

Never invent metrics before they are real.

### Section 7 — Pricing
Keep pricing simple.

---

## 4. Onboarding redesign

The current setup flow exposes too much of the machinery.

The user should not need to understand:
- packs
- AI model tiers
- card limits
- BYOK
- generation architecture
- internal terminology

before experiencing the product.

### Recommended onboarding

#### Step 1 — What distracts you?
Checkboxes:
- Reddit
- YouTube
- X
- Instagram
- Facebook
- Hacker News
- Add another

#### Step 2 — What do you want to improve?
Categories:
- Programming
- Spanish / languages
- University
- Interview preparation
- Professional certification
- General knowledge
- Something else

#### Step 3 — What specifically?
Example:

> React and system design

#### Step 4 — Generate starter material automatically
Generate around 10–20 useful starter cards.

Do not make the user manually understand "packs" first.

#### Step 5 — Install / connect Chrome extension
Guide the user through installation.

#### Step 6 — Test Better Focus
Create a fake/test interruption immediately.

The user should experience the entire product loop within roughly **2–3 minutes**.

---

## 5. Hide most AI implementation details from customers

The project contains or will contain sophisticated AI infrastructure:
- multiple models/providers
- prompt versions
- evals
- tool calling
- RAG
- embeddings
- observability
- cost controls
- async jobs

This is excellent engineering.

It should **not** dominate the consumer UI.

### Avoid customer-facing language such as
- "Access to stronger model"
- "Access to strongest model"
- "100 AI packs"
- "lighter hosted model"

Most customers do not care which model is behind the product.

### Replace with value-based language

Instead of:
> Access to our strongest model

Use:
> **More personalised learning based on your progress**

Instead of:
> Generate 100 packs per month

Use:
> **Generate new learning material whenever you need it**

Instead of:
> Premium model access

Use:
> **Learn from your own notes, documents and sources**

Model and provider details can remain in:
- internal settings
- advanced developer/admin views
- observability
- portfolio documentation

---

## 6. Adaptive tutor should become a major user-facing feature

The adaptive tutor is commercially more valuable than generic AI card generation.

The product should eventually feel like:

> Better Focus knows what you are learning, knows what you keep getting wrong, and uses your distraction moments to reinforce exactly those things.

Example:

Yesterday the user struggled with React closures.

Today they open Reddit.

Better Focus shows:

> Yesterday you struggled with stale closures. Quick one:
>
> Why can an event handler see an old value of state?

This connects:
- topic mastery
- confidence history
- tool calling
- review scheduling

to clear customer value.

---

## 7. RAG / user-provided material should become a premium differentiator

This is one of the strongest commercial opportunities.

The user should be able to provide:
- pasted notes
- documentation
- PDFs
- articles
- university notes
- interview material
- language vocabulary
- course material
- certification guides

Better Focus can then:
1. chunk the material
2. embed it
3. retrieve relevant sections
4. generate learning cards
5. retain citations
6. reinforce weak areas later

### Suggested product message

> **Upload what you need to learn. Better Focus teaches it back to you during moments you'd otherwise waste.**

This is stronger than a generic flashcard generator.

---

## 8. Dashboard redesign

The dashboard should focus on outcomes, not system administration.

### Current-style metrics to de-emphasise
- active blocks
- active cards
- extension connected
- archived cards

These are useful but should not be the emotional centre of the product.

### Recommended dashboard hierarchy

#### Hero
> **12 distractions turned into learning today**

Then:
- 8 learning moments completed
- 6 minutes converted into learning
- React mastery: 71% ↑

#### Primary CTA
> **Continue learning**

#### What you're learning

Example:

```text
React
71% mastery
12 cards due

Spanish
54% mastery
8 cards due
```

#### Biggest opportunity

Example:

> **Closures**
>
> You've missed 3 related questions recently.
>
> [Practice now]

#### Weekly outcome

> **47 distractions turned into 32 minutes of learning this week**

Blocked-site settings and extension status should remain accessible, but should feel like settings/support rather than the main dashboard.

---

## 9. Make the interruption screen the best part of the product

The interruption experience is the product's critical moment.

It should feel:
- fast
- lightweight
- useful
- non-punitive
- visually clean

The product should not feel like it is fighting the user.

### Potential intervention modes

#### Quick
One question.

#### Focus
Three questions before proceeding.

#### Intentional
Ask:

> Why are you opening this site?

before allowing access.

#### Hard
Require a learning interaction before continuing.

#### Soft
Allow immediate bypass.

#### Smart
Better Focus decides the appropriate interruption based on:
- prior bypass behaviour
- time of day
- mastery
- recent learning
- user preferences

### Important principle
Always provide a clear way to continue.

For example:

> Continue anyway

The goal is changing unconscious behaviour, not imprisoning the user.

If users feel trapped, they will disable the extension.

---

## 10. Pricing simplification

### Current public structure
The existing product currently has:
- Free
- Pro
- Premium

with BYOK as an internal/advanced option.

This is probably too complex for an early consumer product.

### Recommended launch structure
Use only **two public tiers** initially:

#### Free
£0

The free tier should let users experience the complete Better Focus loop.

Possible limits:
- 3 blocked sites
- 2 learning topics
- around 100 stored cards
- basic AI starter generation
- basic spaced repetition
- basic progress
- limited monthly generation
- potentially one uploaded learning source

The user should understand the value before being asked to pay.

#### Better Focus Pro

Suggested pricing to test:

> **£4.99/month**

or

> **£39.99/year**

Potential launch offer:

> **£29.99/year founding member**

Possible features:
- unlimited or high-limit blocked websites
- unlimited learning topics
- high card limits
- adaptive tutor
- weak-topic personalisation
- upload notes / PDFs / sources
- deeper progress insights
- configurable interruption modes
- schedules
- higher generation allowances
- sync/history
- future premium functionality

### Remove Premium initially

Do not make users decide between:
- 2,500 vs 10,000 cards
- 25 vs 100 packs
- "stronger" vs "strongest" model

These are implementation-oriented distinctions, not meaningful customer decisions.

A higher tier can be introduced later if real usage demonstrates a clear need.

---

## 11. Recommended pricing philosophy

Do not compete primarily on being cheap.

The current pricing is already relatively low.

Better Focus should compete on:
- distinct behaviour change
- learning value
- personalisation
- convenience
- turning wasted time into something useful

A slightly higher but simpler paid tier can make the product feel more serious.

The exact £4.99 / £39.99 figures should be treated as **testable hypotheses**, not permanent truth.

---

## 12. Starter templates should be added

One major friction point is making users create learning material from scratch.

Add high-quality starter templates.

### Developers
- JavaScript fundamentals
- React
- TypeScript
- system design
- frontend interviews
- backend fundamentals
- SQL
- networking / HTTP

### Language learners
- Spanish common vocabulary
- Colombian Spanish
- irregular verbs
- travel Spanish

### Professional learning
- AWS certification
- Scrum / Agile
- project management
- cybersecurity fundamentals

### Students
Eventually:
- GCSE / A-level material
- university subjects

Templates provide immediate value and make onboarding faster.

---

## 13. Scheduling and blocking improvements

Before heavily marketing the product, add or improve:
- work-hour schedules
- weekday/weekend rules
- temporary pause
- snooze
- bypass
- different intervention intensity per site
- time-limited bypass

Example:

```text
Reddit
Mon–Fri
09:00–17:00
Mode: Smart
```

The product should adapt to real life rather than requiring permanent blocking.

---

## 14. Key metric: "distractions converted into learning"

Better Focus should build its identity around one memorable outcome.

Avoid making:
> cards reviewed

the primary success metric.

Instead highlight:

> **Distractions converted into learning**

Examples:

> You turned 47 distractions into 32 minutes of learning this week.

> Instead of opening Reddit 68 times this month, you answered 54 React questions.

This is much more emotionally connected to why the user installed the product.

### Dashboard / progress metrics
Potential metrics:
- distraction attempts intercepted
- learning interactions completed
- minutes redirected into learning
- bypass rate
- learning streak
- mastery improvement
- weakest topic improvement

---

## 15. Initial target market

Do not initially market Better Focus to:

> everyone who procrastinates

That is too broad.

### Recommended first niche

#### Developers / tech workers who are actively learning

Reasons:
- they spend significant time in Chrome
- they are comfortable installing browser extensions
- they frequently use Reddit, X, Hacker News and YouTube
- continuous learning is part of their career
- they understand flashcards and spaced repetition
- they already use AI tools
- they can afford a £30–40/year subscription

### Founder/product story

A credible message:

> I was trying to improve as an engineer but kept instinctively opening distracting websites, so I built something that makes those moments teach me instead.

This is much stronger than generic productivity marketing.

### Expansion markets later

If developer adoption works:
1. students
2. language learners
3. professional certification learners
4. general knowledge workers

---

## 16. Public launch requirements

Before actively selling the product, prioritise:

1. excellent onboarding
2. test interruption during onboarding
3. polished interruption UI
4. strong landing page
5. starter learning templates
6. schedules
7. temporary pause / easy bypass
8. adaptive weak-topic learning
9. user-source upload / RAG
10. useful progress metrics
11. GDPR/privacy basics
12. account deletion/export
13. password recovery
14. reliable subscription cancellation
15. error monitoring
16. basic customer support/contact
17. feedback collection
18. onboarding email / lifecycle messaging

Do not prioritise MCP, extra agents or more AI model complexity before these.

---

## 17. Product-market validation

The next question is not:

> Can we add more features?

It is:

> Will people use this repeatedly and pay for it?

### Initial test
Recruit approximately **20–30 genuine users**.

Prefer users matching the first target audience.

Measure:

#### Activation
Did the user successfully experience at least one blocked-site learning interruption?

#### Day-1 retention
Did they use Better Focus again the following day?

#### Day-7 retention
Are they still using the extension after a week?

#### Interrupt completion
How many interruptions lead to completed learning vs immediate bypass?

#### Disable/uninstall rate
How quickly do users disable or remove the extension?

#### Learning-source usage
Do users actually provide material they care about learning?

#### Upgrade intent
After experiencing value, will users pay?

### Important interpretation

If most users uninstall quickly:

> Fix UX/product behaviour.

Do not respond by adding more AI.

If users are still actively using it after 1–2 weeks:

> That is a strong signal worth pursuing.

---

## 18. Commercial assessment

Current assessment:

| Area | Assessment |
|---|---|
| Core concept | Strong |
| Differentiation | Strong |
| Technical potential | Strong |
| Consumer UX | Needs refinement |
| Value proposition clarity | Needs simplification |
| Pricing structure | Too complicated |
| Distribution | Major weakness |
| Evidence of PMF | Not yet established |

### Overall conclusion

Better Focus has genuine potential to become a paid public product.

It should **not** yet be treated as proven product-market fit.

The concept is differentiated enough that it deserves a proper public test.

The strongest version of the product is:

> **Better Focus**
>
> **Turn distractions into learning.**
>
> Pick the sites that steal your time.
>
> Tell Better Focus what you want to learn.
>
> Every time habit takes you somewhere distracting, learn something first.

The adaptive layer strengthens this:

> **The more you struggle with something, the more Better Focus helps you practise it.**

---

## 19. Engineering vs product priority from this point

After the v1–v5 architecture is integrated and stable, stop aggressively expanding the AI feature set.

Suggested effort split:

```text
70% product / UX / distribution
30% engineering
```

The engineering priority should be:
- reliability
- bug fixes
- performance
- instrumentation
- user feedback-driven improvements

rather than adding more technical concepts for portfolio value.

---

## 20. Codex implementation guidance

When implementing these product changes:

1. Preserve the existing engineering work.
2. Simplify the user-facing surface.
3. Do not expose internal AI concepts unnecessarily.
4. Prefer progressive disclosure for advanced functionality.
5. Optimise onboarding for time-to-first-value.
6. Treat the interruption screen as the critical experience.
7. Use outcome-based copy throughout.
8. Do not invent social proof or metrics.
9. Keep pricing definitions centralised rather than duplicated across pages.
10. Build reusable components for plan definitions, onboarding and learning-topic cards.
11. Maintain accessible keyboard interaction and mobile responsiveness.
12. Keep demo mode usable.
13. Instrument activation, bypass and retention events before public testing.
14. Do not remove existing working functionality without confirming it is obsolete.

---

## Recommended implementation order

### Phase A — Messaging
- change positioning to "Turn distraction into learning"
- rewrite landing-page hero
- simplify explanation
- build visual interruption demo

### Phase B — Onboarding
- distractions first
- learning goal second
- auto-generate starter content
- extension install
- test interruption

### Phase C — Core UX
- redesign interruption screen
- introduce bypass / intervention modes
- simplify dashboard around outcomes

### Phase D — Commercial UX
- simplify to Free + Pro
- replace model/pack language with value language
- add starter templates
- add schedules / pause controls

### Phase E — Personalisation
- surface adaptive tutor in a natural way
- weak-topic interventions
- RAG/source upload UI

### Phase F — Validation instrumentation
Track:
- onboarding completion
- first interruption
- interruption completion
- bypass rate
- site-level disable behaviour
- day-1/day-7 usage
- generated source adoption
- upgrade attempts

### Phase G — Public test
Recruit a small cohort and iterate based on behaviour rather than assumptions.

---

## Final product principle

The engineering can be sophisticated.

The product should feel simple.

The user should understand Better Focus as:

> **I try to procrastinate. Better Focus catches the moment and helps me learn something I actually care about.**

Everything else should support that.
