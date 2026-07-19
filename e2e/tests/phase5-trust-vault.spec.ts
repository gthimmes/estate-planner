import { expect, test, type Page } from '@playwright/test'
import { addFamily, onboard } from './helpers'

async function setUpHouseholdWithHouse(page: Page) {
  await onboard(page, {
    planName: 'The Trust Family',
    firstName: 'Gray',
    lastName: 'Grantor',
    dob: '1968-01-01',
    state: 'CO',
    maritalStatus: 'Married',
  })
  await addFamily(page, [{ first: 'Trudy', last: 'Trustee', role: 'Spouse', dob: '1969-02-02' }])

  await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
  await page.getByLabel(/^name$/i).fill('Family home')
  await page.getByLabel(/category/i).selectOption('RealEstate')
  await page.getByLabel(/estimated value/i).fill('500000')
  await page.getByRole('button', { name: /add to inventory/i }).click()
  await expect(page.getByRole('cell', { name: 'Family home' })).toBeVisible()
}

test.describe('Phase 5: trust, funding, and vault', () => {
  test('trust lifecycle: draft, sign, fund — probate exposure disappears', async ({ page }) => {
    await setUpHouseholdWithHouse(page)

    // The house is exposed to probate
    await expect(page.getByText('Goes through probate')).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/\$500,000 would go through probate today/i)).toBeVisible()

    // Create and finish the trust
    await page.getByRole('navigation').getByRole('link', { name: 'Living trust' }).click()
    await page
      .getByRole('combobox', { name: 'This trust is for', exact: true })
      .selectOption({ label: 'Gray Grantor' })
    await page
      .getByRole('combobox', { name: 'Successor trustee', exact: true })
      .selectOption({ label: 'Trudy Trustee' })
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()

    await expect(page.getByRole('heading', { name: /the gray grantor living trust/i })).toBeVisible()
    const doc = page.locator('.legal-document')
    await expect(doc).toContainText('successor Trustee without court involvement')
    await expect(doc).toContainText('No assets have been retitled into this trust yet')
    await expect(page.getByText(/an unfunded trust avoids nothing/i).first()).toBeVisible()

    // Sign it
    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel(/date signed/i).fill(today)
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByText(new RegExp(`signed on ${today}`, 'i'))).toBeVisible()

    // Fund the house from the checklist; Schedule A picks it up
    // (controlled checkbox: state flips after the API round-trip, so click + assert)
    const fundingBox = page.getByRole('checkbox', { name: /family home/i })
    await fundingBox.click()
    await expect(fundingBox).toBeChecked()
    await expect(doc).toContainText('• Family home (RealEstate)')

    // Probate exposure is gone
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/would go through probate today/i)).not.toBeVisible()
    const trustItem = page.getByRole('listitem').filter({ hasText: 'Consider a living trust' })
    await expect(trustItem).toContainText(/signed on .* and funded/i)

    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    await expect(page.getByText('Skips probate (in trust)')).toBeVisible()
  })

  test('vault aggregates document statuses and stores pointers', async ({ page }) => {
    await setUpHouseholdWithHouse(page)

    await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click()
    await expect(page.getByRole('heading', { name: /your vault/i })).toBeVisible()
    // All four documents listed, none started
    for (const title of [
      'Last will and testament',
      'Revocable living trust',
      'Financial power of attorney',
      'Advance healthcare directive',
    ]) {
      await expect(page.getByRole('cell', { name: title })).toBeVisible()
    }
    await expect(page.getByText('Not started').first()).toBeVisible()

    // Add a pointer
    await page.getByLabel(/what is it/i).fill('House deed')
    await page.getByLabel(/category/i).selectOption('PropertyDeed')
    await page.getByLabel(/where is it/i).fill('Safe deposit box #12 at First National')
    await page.getByRole('button', { name: /add to vault/i }).click()
    await expect(page.getByRole('cell', { name: 'House deed' })).toBeVisible()
    await expect(page.getByRole('cell', { name: /safe deposit box #12/i })).toBeVisible()

    // Upload a signed copy into the vault
    await page.getByLabel(/upload a signed copy/i).setInputFiles({
      name: 'signed-will.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 signed copy for the vault'),
    })
    await expect(page.getByRole('link', { name: 'signed-will.pdf' })).toBeVisible()

    // The executor's guide assembles the whole picture, vault pointers included
    await page.getByRole('navigation').getByRole('link', { name: /executor's guide/i }).click()
    await expect(page.getByRole('heading', { name: /executor's guide — estate of gray grantor/i })).toBeVisible()
    const guide = page.locator('.legal-document')
    await expect(guide).toContainText('House deed (PropertyDeed): Safe deposit box #12')
    await expect(guide).toContainText('certified copies of the death certificate')
    await expect(page.getByRole('link', { name: /download pdf/i })).toBeVisible()
  })
})
