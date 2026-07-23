import { expect, test } from '@playwright/test'
import { onboard } from './helpers'

test.describe('Estate tax awareness', () => {
  test('an Oregon estate over the state exemption sees the awareness note', async ({ page }) => {
    await onboard(page, {
      planName: 'Oregon Estate',
      firstName: 'Port',
      lastName: 'Lander',
      dob: '1960-01-01',
      state: 'OR',
      maritalStatus: 'Single',
    })

    // Under the $1M exemption: no tax section
    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    await page.getByLabel(/^name$/i).fill('Brokerage')
    await page.getByLabel(/category/i).selectOption('Investment')
    await page.getByLabel(/estimated value/i).fill('600000')
    await page.getByLabel(/beneficiary on file/i).selectOption('Designated')
    await page.getByRole('textbox', { name: /beneficiary name/i }).fill('A Friend')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name: 'Brokerage' })).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/estate & inheritance tax awareness/i)).not.toBeVisible()

    // Add the house: net estate crosses Oregon's $1M line
    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    await page.getByLabel(/^name$/i).fill('Portland home')
    await page.getByLabel(/category/i).selectOption('RealEstate')
    await page.getByLabel(/estimated value/i).fill('700000')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name: 'Portland home' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/estate & inheritance tax awareness/i)).toBeVisible()
    await expect(page.getByText(/OR has a state estate tax/i)).toBeVisible()
    await expect(page.getByText(/not tax or legal advice/i)).toBeVisible()
  })

  test('a Pennsylvania plan notes the inheritance tax for heirs', async ({ page }) => {
    await onboard(page, {
      planName: 'Keystone Plan',
      firstName: 'Penn',
      lastName: 'Sylvan',
      dob: '1970-01-01',
      state: 'PA',
      maritalStatus: 'Married',
    })
    await expect(page.getByText(/estate & inheritance tax awareness/i)).toBeVisible()
    await expect(page.getByText(/PA has an inheritance tax paid by heirs/i)).toBeVisible()
  })
})
