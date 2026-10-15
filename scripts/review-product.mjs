// Optional visual review: install Playwright into %TEMP%/better-focus-review first.
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const require = createRequire(
  join(tmpdir(), 'better-focus-review', 'package.json'),
)
const { chromium } = require('playwright')
const { default: AxeBuilder } = require('@axe-core/playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const output = join(tmpdir(), 'better-focus-screenshots')
await mkdir(output, { recursive: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
})
const page = await context.newPage()
const errors = []
const accessibility = []
const flowOnly = process.argv.includes('--flow-only')
page.on('pageerror', (error) => errors.push(error.message))
const origin = process.env.REVIEW_URL ?? 'http://127.0.0.1:5175'
await page.goto(origin)
assert.equal(
  await page.getByText('Becomes a useful pause', { exact: true }).count(),
  0,
)
await page.getByRole('link', { name: 'See how it works', exact: true }).click()
await page.locator('#inside-the-app img').first().waitFor()
await page.evaluate(async () => {
  await Promise.all(
    [...document.querySelectorAll('#inside-the-app img')].map((image) => {
      image.loading = 'eager'
      return image.decode()
    }),
  )
})
await page.screenshot({ path: join(output, 'landing.png'), fullPage: true })
if (!flowOnly) {
  const publicAudit = await new AxeBuilder({ page }).analyze()
  accessibility.push({
    route: '/',
    violations: publicAudit.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      nodes: item.nodes.map((node) => node.target),
    })),
  })
}
await page.evaluate(() =>
  localStorage.setItem('stop-procrastinating.demo-email', 'review@example.com'),
)
for (const route of ['/app', '/app/cards', '/app/sites', '/app/onboarding']) {
  await page.goto(`${origin}${route}`)
  await page.waitForTimeout(400)
  await page.screenshot({
    path: join(output, `${route.split('/').at(-1)}.png`),
    fullPage: true,
  })
}

// Test the real local user flow without fabricating AI output or progress.
await page.goto(`${origin}/app/cards`)
await page.getByRole('combobox').nth(0).selectOption('languages')
await page.getByRole('combobox').nth(1).selectOption('French')
await page
  .getByLabel('Your learning goal')
  .fill('French for travel and conversation')
await page.getByRole('button', { name: 'Find my starter options' }).click()
await page
  .getByRole('button', { name: /Ready immediately.*French for everyday life/ })
  .click()
await page
  .getByRole('heading', { name: 'French for everyday life', exact: true })
  .waitFor()
await page.getByRole('button', { name: 'Add to my learning' }).click()
await page
  .getByRole('heading', { name: 'Everyday French', exact: true })
  .waitFor()
await page.getByRole('link', { name: 'Practise', exact: true }).click()
await page.getByRole('button', { name: 'Show answer', exact: true }).click()
await page.getByRole('button', { name: 'Got it', exact: true }).click()
await page
  .getByRole('heading', { name: 'That is a moment well spent.' })
  .waitFor()
const practiceState = await page.evaluate(() => ({
  cards: JSON.parse(
    localStorage.getItem('stop-procrastinating.learning-cards.demo-user') ??
      '[]',
  ),
  sessions: JSON.parse(
    localStorage.getItem('stop-procrastinating.interrupt-sessions.demo-user') ??
      '[]',
  ),
}))
assert.equal(practiceState.cards.length, 10)
assert.equal(
  practiceState.sessions.length,
  1,
  'React StrictMode must not create duplicate sessions',
)
assert.equal(practiceState.sessions[0].source, 'practice')
assert.equal(practiceState.sessions[0].outcome, 'completed')
assert.ok(
  practiceState.cards.some(
    (card) => card.nextReviewAt && new Date(card.nextReviewAt) > new Date(),
  ),
)
await page.screenshot({
  path: join(output, 'practice-complete.png'),
  fullPage: true,
})

await page.goto(
  `${origin}/interrupt?site=reddit.com&source=extension&returnUrl=https%3A%2F%2Freddit.com`,
)
await page.getByRole('button', { name: 'Show answer', exact: true }).click()
await page.getByRole('button', { name: 'Almost there', exact: true }).click()
await page
  .getByRole('heading', { name: 'That is a moment well spent.' })
  .waitFor()
await page.goto(`${origin}/app`)
await page.getByText('1', { exact: true }).first().waitFor()
await page.screenshot({
  path: join(output, 'app-populated.png'),
  fullPage: true,
})

await page.goto(`${origin}/app/sites`)
await page.getByLabel('Add a distracting site').fill('reddit.com')
await page.getByRole('button', { name: 'Add site', exact: true }).click()
await page.getByRole('heading', { name: 'reddit.com', exact: true }).waitFor()
await page.getByText('Every day · All day', { exact: true }).waitFor()
await page.getByText('Schedule & preferences', { exact: true }).click()
await page.getByRole('checkbox', { name: /Protect all day/ }).uncheck()
await page.getByRole('button', { name: 'Sun', exact: true }).click()
await page.getByRole('button', { name: 'Sat', exact: true }).click()
await page.getByLabel('From', { exact: true }).fill('10:00')
await page.getByLabel('Until', { exact: true }).fill('18:00')
await page.getByRole('button', { name: 'Save schedule', exact: true }).click()
await page.getByRole('status').filter({ hasText: 'saved' }).waitFor()
await page.reload()
await page.getByText('Weekdays · 10:00–18:00', { exact: true }).waitFor()
await page.getByRole('button', { name: 'Snooze 30 min', exact: true }).click()
await page.getByRole('button', { name: 'End snooze', exact: true }).waitFor()

await page.goto(`${origin}/app/onboarding`)
await page.getByRole('checkbox', { name: 'Reddit', exact: true }).check()
await page.getByRole('button', { name: 'Now, something to learn' }).click()
await page.getByRole('button', { name: 'Use my existing questions' }).click()
await page.getByRole('button', { name: 'Try it without the extension' }).click()
await page.getByRole('button', { name: 'Try my first pause' }).click()
await page.getByRole('button', { name: 'Show answer', exact: true }).click()
await page.getByRole('button', { name: 'Got it', exact: true }).click()
await page
  .getByRole('heading', { name: 'That is a moment well spent.' })
  .waitFor()
const onboardingState = await page.evaluate(() => ({
  profile: JSON.parse(
    localStorage.getItem('better-focus.product-profile.demo-user') ?? 'null',
  ),
  sessions: JSON.parse(
    localStorage.getItem('stop-procrastinating.interrupt-sessions.demo-user') ??
      '[]',
  ),
}))
assert.ok(onboardingState.profile.onboardingCompletedAt)
assert.equal(
  onboardingState.sessions.filter(
    (session) =>
      session.source === 'extension' && session.outcome === 'completed',
  ).length,
  1,
)
assert.equal(onboardingState.sessions[0].source, 'onboarding')

// Stub the destination so bypass behavior is tested without visiting an external site.
await page.route('https://reddit.com/', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<main>Returned to intended site</main>',
  }),
)
await page.goto(
  `${origin}/interrupt?site=reddit.com&source=extension&returnUrl=https%3A%2F%2Freddit.com`,
)
await page.getByRole('button', { name: 'Show answer', exact: true }).waitFor()
await page.getByRole('button', { name: 'Continue anyway', exact: true }).click()
await page.waitForURL('https://reddit.com/')
await page.goto(`${origin}/app/cards`)
await page.getByText('Write my own question', { exact: true }).click()
await page.getByLabel('Topic (optional)').fill('My new subject')
await page
  .getByLabel('Question', { exact: true })
  .fill('What is a useful test question?')
await page
  .getByLabel('Answer', { exact: true })
  .fill('One with a concrete answer.')
await page.getByRole('button', { name: 'Save my question' }).click()
await page
  .getByRole('heading', { name: 'My new subject', exact: true })
  .waitFor()
const bypassState = await page.evaluate(() =>
  JSON.parse(
    localStorage.getItem('stop-procrastinating.interrupt-sessions.demo-user') ??
      '[]',
  ),
)
assert.equal(bypassState[0].outcome, 'bypassed')

if (!flowOnly) {
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      localStorage.setItem('stop-procrastinating.theme', value)
    }, theme)
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of [
        '/app',
        '/app/cards',
        '/app/sites',
        '/app/onboarding',
        '/app/tutor',
        '/app/sources',
        '/app/pricing',
        '/interrupt?source=practice',
        '/app/cards/manage',
      ]) {
        await page.goto(`${origin}${route}`)
        await page.waitForTimeout(150)
        if (
          !(await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ))
        ) {
          await page.screenshot({
            path: join(output, 'overflow.png'),
            fullPage: true,
          })
          console.log(
            await page.evaluate(() =>
              [...document.querySelectorAll('body *')]
                .filter(
                  (el) => el.getBoundingClientRect().right > innerWidth + 1,
                )
                .slice(0, 12)
                .map((el) => ({
                  tag: el.tagName,
                  class: el.className,
                  width: el.getBoundingClientRect().width,
                  right: el.getBoundingClientRect().right,
                })),
            ),
          )
          assert.fail(`${route} overflows at ${width}px in ${theme}`)
        }
        const audit = await new AxeBuilder({ page }).analyze()
        accessibility.push({
          route,
          width,
          theme,
          violations: audit.violations.map((item) => ({
            id: item.id,
            impact: item.impact,
            nodes: item.nodes.map((node) => node.target),
          })),
        })
        await page.screenshot({
          path: join(
            output,
            `${route.split('?')[0].split('/').at(-1)}-${width}-${theme}.png`,
          ),
          fullPage: true,
        })
      }
    }
  }
}
const violations = accessibility.filter((item) => item.violations.length)
console.log(
  JSON.stringify(
    {
      output,
      errors,
      violations,
      auditedStates: accessibility.length,
      checks: `Starter preview/save, scheduled review, session attribution, schedules, snooze, onboarding, bypass, manual question creation${flowOnly ? '' : ', responsive layouts, light/dark accessibility'}`,
    },
    null,
    2,
  ),
)
await browser.close()
if (errors.length || violations.length) process.exitCode = 1
