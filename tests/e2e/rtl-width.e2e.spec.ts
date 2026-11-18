import { expect, test } from '@playwright/test'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

test.use({ viewport: { width: 1280, height: 900 } })

test.beforeAll(seedTestUser)
test.afterAll(cleanupTestUser)

test('rich text edit view in the Arabic admin has no horizontal overflow', async ({ page }) => {
  await page.request.post('http://localhost:3000/api/users/login', { data: testUser })
  await page.goto('http://localhost:3000/admin/collections/articles/create')
  await expect(page.locator('html')).toHaveAttribute('dir', /^rtl$/i)
  await page.locator('.rich-text-lexical [contenteditable="true"]').waitFor()

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBe(1280)
})
