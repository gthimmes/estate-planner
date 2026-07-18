import { expect, test, type Page } from '@playwright/test'
import { addFamily, onboard } from './helpers'

async function setUpCouple(page: Page) {
  await onboard(page, {
    planName: 'The Agent Family',
    firstName: 'Pat',
    lastName: 'Principal',
    dob: '1970-05-05',
    state: 'OH',
    maritalStatus: 'Married',
  })
  await addFamily(page, [{ first: 'Aiden', last: 'Agent', role: 'Spouse', dob: '1971-06-06' }])
}

test.describe('Phase 4: POA and healthcare directive', () => {
  test('financial POA: springing choice, document, and signing', async ({ page }) => {
    await setUpCouple(page)

    await page.getByRole('navigation').getByRole('link', { name: 'Power of attorney' }).click()
    await page
      .getByRole('combobox', { name: 'This document is for', exact: true })
      .selectOption({ label: 'Pat Principal' })
    await page
      .getByRole('combobox', { name: 'Financial agent', exact: true })
      .selectOption({ label: 'Aiden Agent' })
    await page.getByRole('radio', { name: /only if i become incapacitated/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()

    const doc = page.locator('.legal-document')
    await expect(
      page.getByRole('heading', { name: /durable power of attorney of pat principal/i }),
    ).toBeVisible()
    await expect(doc).toContainText('appoint Aiden Agent')
    await expect(doc).toContainText('springing')
    await expect(doc).not.toContainText('DRAFT')
    await expect(page.getByText(/take it to a notary public/i)).toBeVisible()

    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel(/date signed/i).fill(today)
    await page.getByLabel(/notes/i).fill('Notarized at the credit union')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByText(new RegExp(`signed on ${today}`, 'i'))).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    const poaItem = page.getByRole('listitem').filter({ hasText: 'Financial power of attorney' })
    await expect(poaItem).toContainText(/signed on/i)
  })

  test('healthcare directive: life-support required, HIPAA bundled, readiness updates', async ({
    page,
  }) => {
    await setUpCouple(page)

    await page.getByRole('navigation').getByRole('link', { name: 'Healthcare wishes' }).click()
    await page
      .getByRole('combobox', { name: 'This document is for', exact: true })
      .selectOption({ label: 'Pat Principal' })
    await page
      .getByRole('combobox', { name: 'Healthcare agent', exact: true })
      .selectOption({ label: 'Aiden Agent' })

    // Completing without a life-support choice is blocked by the API
    await page.getByRole('button', { name: /finish & preview document/i }).click()
    await expect(page.getByRole('alert')).toContainText(/life-support/i)

    await page.getByRole('radio', { name: /don't prolong my life/i }).check()
    await page.getByRole('checkbox', { name: /organ donor/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()

    const doc = page.locator('.legal-document')
    await expect(
      page.getByRole('heading', { name: /advance healthcare directive of pat principal/i }),
    ).toBeVisible()
    await expect(doc).toContainText('I do not want my life prolonged')
    await expect(doc).toContainText('HIPAA')
    await expect(doc).toContainText('donate any organs')
    await expect(page.getByText(/two adult witnesses/i)).toBeVisible()

    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel(/date signed/i).fill(today)
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByText(/editing below revokes the signing record/i)).toBeVisible()

    // household + family + healthcare = 3/9 → 33%
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    const healthcareItem = page
      .getByRole('listitem')
      .filter({ hasText: 'Advance healthcare directive' })
    await expect(healthcareItem).toContainText(/signed on/i)
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /33 percent/,
    )
  })
})
