import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('client app loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/estate planner/i)
  })

  test('backend is reachable through the client proxy', async ({ page }) => {
    const response = await page.request.get('/api/health')
    expect(response.ok()).toBe(true)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
