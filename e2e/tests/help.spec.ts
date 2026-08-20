import { test, expect } from '@playwright/test'
import { onboard } from './helpers'

// The in-app help center (help-navigator widget mounted in App.tsx).
// Playwright locators pierce the widget's shadow root automatically.
test.describe('help center', () => {
  test('contextual help follows the route, search and articles work', async ({ page }) => {
    await onboard(page, {
      planName: 'Help E2E Plan',
      firstName: 'Harper',
      lastName: 'Quill',
      dob: '1980-04-12',
      state: 'WA',
    })

    // Launcher opens contextual help on the dashboard.
    await page.getByRole('button', { name: 'Open help' }).click()
    const panel = page.getByRole('dialog', { name: 'Help & guidance' })
    await expect(panel.getByText('Suggested for this page')).toBeVisible()
    await expect(panel.getByText('The estate readiness score')).toBeVisible()
    await expect(panel.getByText('Browse by topic')).toBeVisible()

    // Esc closes; context follows a route change; F1 reopens.
    await page.keyboard.press('Escape')
    await expect(panel.getByText('Browse by topic')).not.toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await page.keyboard.press('F1')
    await expect(panel.getByText('The guided will interview')).toBeVisible()
    await expect(panel.getByText('Choosing an executor and agents')).toBeVisible()

    // Search with highlighted results; article renders markdown.
    await panel.getByPlaceholder('Search help articles…').fill('witnesses')
    await expect(panel.locator('mark').first()).toBeVisible()
    await panel.getByRole('button', { name: /Making your documents legally count/ }).click()
    await expect(
      panel.getByRole('heading', { name: 'Making your documents legally count' }),
    ).toBeVisible()
    await expect(panel.getByText('The signing walkthrough')).toBeVisible()

    // Feedback emits and collapses to a thank-you.
    await panel.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(panel.getByText('Thanks for the feedback!')).toBeVisible()

    // Related articles navigate within the panel; back returns.
    // (.hn-item scopes to the related list; the prev/next pager also links this article.)
    await panel.locator('button.hn-item', { hasText: 'E-signing, where your state allows it' }).click()
    await expect(
      panel.getByRole('heading', { name: 'E-signing, where your state allows it' }),
    ).toBeVisible()
    await panel.getByRole('button', { name: 'Back' }).click()
    await expect(
      panel.getByRole('heading', { name: 'Making your documents legally count' }),
    ).toBeVisible()
  })

  test('category browsing from the help home', async ({ page }) => {
    await onboard(page, {
      planName: 'Help Browse Plan',
      firstName: 'Rowan',
      lastName: 'Ashe',
      dob: '1975-09-30',
      state: 'CO',
      maritalStatus: 'Single',
    })

    await page.getByRole('button', { name: 'Open help' }).click()
    const panel = page.getByRole('dialog', { name: 'Help & guidance' })
    await panel.getByRole('button', { name: /Signing & executing/ }).click()
    await expect(panel.getByText('Witnesses, notarization, and making your documents')).toBeVisible()
    await panel.getByRole('button', { name: /Making your documents legally count/ }).click()
    await expect(panel.getByText('Already signed it? Make it count')).toBeVisible()
    await panel.getByRole('button', { name: 'Back' }).click()
    await panel.getByRole('button', { name: 'Back' }).click()
    await expect(panel.getByText('Browse by topic')).toBeVisible()
  })
})
