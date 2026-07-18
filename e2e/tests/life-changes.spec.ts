import { expect, test } from '@playwright/test'
import { addFamily, onboard, today } from './helpers'

test.describe('Life changes', () => {
  test('moving states flags signed documents for review', async ({ page }) => {
    await onboard(page, {
      planName: 'Movers Plan',
      firstName: 'Max',
      lastName: 'Mover',
      dob: '1970-01-01',
      state: 'TX',
      maritalStatus: 'Married',
    })
    await addFamily(page, [{ first: 'Mel', last: 'Mover', role: 'Spouse', dob: '1971-02-02' }])

    // Complete and sign the will under TX law
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Mel Mover' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click() // no gifts
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByLabel(/witness 1/i).fill('Wanda Witness')
    await page.getByLabel(/witness 2/i).fill('Wesley Witness')
    await page.getByLabel(/where is the signed original/i).fill('Safe')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()

    // No warning while still in TX
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/signed under another state's law/i)).not.toBeVisible()

    // The family moves to Colorado
    await page.getByRole('navigation').getByRole('link', { name: 'Life changes' }).click()
    await expect(page.getByText(/when life changes, revisit your plan/i)).toBeVisible()
    await page.getByLabel(/state of residence/i).selectOption('CO')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/check your dashboard/i)).toBeVisible()

    // The dashboard flags the TX-signed will
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/signed under another state's law/i)).toBeVisible()
    await expect(page.getByText(/will \(max mover\) — signed under TX law/i)).toBeVisible()
    await expect(page.getByText(/planning under CO law/i).first()).toBeVisible()
  })
})
