import { test, expect } from '@playwright/test'

test('placeholder page loads', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Jive Moves Graph' }),
  ).toBeVisible()
})
