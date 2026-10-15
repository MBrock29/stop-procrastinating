// Optional signed-out landing review using the same temporary tools as review-product.mjs.
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
const origin = process.env.REVIEW_URL ?? 'http://127.0.0.1:5175'
const output = join(tmpdir(), 'better-focus-screenshots')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ timezoneId: 'Europe/London' })
  const page = await context.newPage()
  const errors = []
  const results = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 })
      await page.goto(origin)
      await page.evaluate(
        (value) => localStorage.setItem('stop-procrastinating.theme', value),
        theme,
      )
      await page.reload()
      await page.getByRole('heading', { name: /Stop doomscrolling/ }).waitFor()
      assert.equal(
        await page.getByText('Becomes a useful pause', { exact: true }).count(),
        0,
      )
      assert.equal(await page.locator('#inside-the-app img').count(), 3)
      assert.equal(
        await page
          .locator('main > section')
          .first()
          .evaluate((el) => getComputedStyle(el).display),
        'block',
      )
      await page.evaluate(async () => {
        await Promise.all(
          [...document.querySelectorAll('#inside-the-app img')].map((image) => {
            image.loading = 'eager'
            return image.decode()
          }),
        )
        await document.fonts.ready
      })
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}px`,
      )
      await page
        .getByRole('link', { name: 'See how it works', exact: true })
        .click()
      assert.equal(new URL(page.url()).hash, '#inside-the-app')
      const popupPromise = context.waitForEvent('page')
      await page
        .getByRole('link', {
          name: 'Open full-size screenshot of a Better Focus learning pause',
          exact: true,
        })
        .click()
      const popup = await popupPromise
      await popup.waitForLoadState()
      assert.ok(popup.url().endsWith('/screenshots/learning-pause.png'))
      await popup.close()
      await page.evaluate(() => scrollTo(0, 0))
      const audit = await new AxeBuilder({ page }).analyze()
      results.push({
        theme,
        width,
        violations: audit.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
      })
      await page.screenshot({
        path: join(output, `landing-${width}-${theme}.png`),
        fullPage: true,
      })
    }
  }
  console.log(JSON.stringify({ output, errors, results }, null, 2))
  assert.equal(errors.length, 0)
  assert.ok(
    results.every((result) => result.violations.length === 0),
    'Accessibility findings require review',
  )
} finally {
  await browser.close()
}
