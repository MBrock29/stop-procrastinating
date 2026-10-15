// Capture actual UI in an isolated local-preview browser profile, without inventing usage data.
// Requires Playwright in %TEMP%/better-focus-review and the local Vite server.
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const require = createRequire(
  join(tmpdir(), 'better-focus-review', 'package.json'),
)
const { chromium } = require('playwright')
const origin = process.env.REVIEW_URL ?? 'http://127.0.0.1:5175'
const output = new URL('../public/screenshots/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    timezoneId: 'Europe/London',
    colorScheme: 'light',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(origin)
  await page.evaluate(() => {
    localStorage.setItem(
      'stop-procrastinating.demo-email',
      'preview@example.test',
    )
    localStorage.setItem('stop-procrastinating.theme', 'light')
  })
  await page.goto(`${origin}/app/cards`)
  await page.getByText('Browse ready-made sets', { exact: true }).click()
  await page.getByRole('button', { name: /French for everyday life/ }).click()
  await page.getByRole('button', { name: 'Add to my learning' }).click()
  await page
    .getByRole('heading', { name: 'Everyday French', exact: true })
    .waitFor()
  for (const title of ['German for everyday life', 'Everyday science']) {
    await page
      .getByRole('button', { name: 'New learning set', exact: true })
      .click()
    await page.getByText('Browse ready-made sets', { exact: true }).click()
    await page.getByRole('button', { name: new RegExp(title) }).click()
    await page.getByRole('button', { name: 'Add to my learning' }).click()
    await page
      .getByRole('button', { name: 'New learning set', exact: true })
      .waitFor()
  }
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: fileURLToPath(new URL('learning-library.png', output)),
    animations: 'disabled',
  })

  await page.goto(`${origin}/app/sites`)
  for (const domain of ['reddit.com', 'youtube.com']) {
    await page.getByLabel('Add a distracting site').fill(domain)
    await page.getByRole('button', { name: 'Add site', exact: true }).click()
    await page.getByRole('heading', { name: domain, exact: true }).waitFor()
  }
  await page.reload()
  await page
    .getByRole('heading', { name: 'youtube.com', exact: true })
    .waitFor()
  assert.equal(
    await page.getByText('Every day · All day', { exact: true }).count(),
    2,
  )
  await page.screenshot({
    path: fileURLToPath(new URL('distractions.png', output)),
    animations: 'disabled',
  })

  await page.goto(
    `${origin}/interrupt?site=reddit.com&source=extension&returnUrl=https%3A%2F%2Freddit.com`,
  )
  await page.getByRole('button', { name: 'Show answer', exact: true }).click()
  await page.getByRole('button', { name: 'Got it', exact: true }).waitFor()
  await page.screenshot({
    path: fileURLToPath(new URL('learning-pause.png', output)),
    animations: 'disabled',
  })
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log(
    'Captured learning-library.png, distractions.png and learning-pause.png from actual app screens.',
  )
} finally {
  await browser.close()
}
