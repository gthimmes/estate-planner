import { expect, test, type Page } from '@playwright/test'
import { addFamily, onboard } from './helpers'

async function completeAWill(page: Page) {
  await onboard(page, {
    planName: 'The Signing Family',
    firstName: 'Alex',
    lastName: 'Adult',
    dob: '1975-03-03',
    state: 'TX',
    maritalStatus: 'Married',
  })
  await addFamily(page, [{ first: 'Blake', last: 'Adult', role: 'Spouse', dob: '1976-04-04' }])

  await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
  await page.getByLabel(/this will is for/i).selectOption({ label: 'Alex Adult' })
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Blake Adult' })
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('button', { name: /continue/i }).click() // no gifts
  await page.getByRole('radio', { name: /everything to my spouse/i }).check()
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('button', { name: /finish my will/i }).click()
  await expect(page).toHaveURL(/\/will\/document$/)
}

test.describe('Phase 3: done means signed', () => {
  test('recording the signing completes the journey and edits revoke it', async ({ page }) => {
    await completeAWill(page)

    // Signing walkthrough is shown for a completed-but-unsigned will
    await expect(page.getByText(/how to make it legal in TX/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /already signed it/i })).toBeVisible()

    // Future signing dates are rejected by the API
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    await page.getByLabel(/date signed/i).fill(tomorrow)
    await page.getByLabel(/witness 1/i).fill('Wanda Witness')
    await page.getByLabel(/witness 2/i).fill('Wesley Witness')
    await page.getByLabel(/where is the signed original/i).fill('Fireproof safe in the study')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('alert')).toContainText(/future/i)

    // A valid signing record flips the will to executed
    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel(/date signed/i).fill(today)
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()
    await expect(page.getByText(/witnessed by Wanda Witness and Wesley Witness/i)).toBeVisible()
    await expect(page.getByText(/fireproof safe in the study/i)).toBeVisible()

    // Dashboard: household + family + will + sign = 4/9 → 44%, sign item checked with storage location
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/original stored: fireproof safe in the study/i)).toBeVisible()
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /44 percent/,
    )

    // Editing the will warns about, then revokes, the signing record
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await expect(page.getByText(/this will has been signed/i)).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click() // save step 1 → reopens draft
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/an unsigned will has no legal effect/i)).toBeVisible()
    // will reopened to draft: household + family = 2/9 → 22%
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /22 percent/,
    )
  })
})
