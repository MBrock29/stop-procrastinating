# Landing-page screenshots

Captured from the actual Better Focus app on 16 October 2026, using an isolated local
preview browser profile, the light theme, and a 1440 × 960 viewport.

- `learning-library.png`: French, German and everyday-science curated sets added through
  the real starter builder. No review or usage counters are fabricated.
- `distractions.png`: Reddit and YouTube added through the site form with the new
  all-day, every-day defaults. The extension status honestly reflects local preview.
- `learning-pause.png`: an actual interruption with a revealed French answer, confidence
  buttons and continuation choices. Its destination is an example; no customer data is used.

To refresh, run the app in local preview at `http://127.0.0.1:5175` and execute
`node scripts/capture-landing-screenshots.mjs`. The script uses Chrome and Playwright
installed in `%TEMP%/better-focus-review`, matching the optional product-review tooling.
Set `REVIEW_URL` to use another local preview address. Then run
`node scripts/review-landing.mjs` to check images, links, responsive layout and accessibility.
