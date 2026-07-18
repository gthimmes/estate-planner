import { expect, test, type Page } from '@playwright/test'
import { addFamily, onboard } from './helpers'

async function setUpHousehold(page: Page) {
  await onboard(page, {
    planName: 'The Will Family',
    firstName: 'Taylor',
    lastName: 'Testator',
    dob: '1980-01-01',
    state: 'CA',
    maritalStatus: 'Married',
  })
  await addFamily(page, [
    { first: 'Sam', last: 'Spouse', role: 'Spouse', dob: '1982-02-02' },
    { first: 'Riley', last: 'Junior', role: 'Child', dob: '2020-05-05' },
  ])
}

test.describe('Phase 2: the will', () => {
  test('guided interview produces a printable will with the right provisions', async ({ page }) => {
    await setUpHousehold(page)

    // --- Interview ---
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await expect(page.getByRole('heading', { name: /whose will is this/i })).toBeVisible()
    await page.getByLabel(/this will is for/i).selectOption({ label: 'Taylor Testator' })
    await page.getByRole('button', { name: /continue/i }).click()

    // Executor step — minors can't be chosen, bond waiver defaults on
    await expect(page.getByRole('heading', { name: /who settles your estate/i })).toBeVisible()
    const executorSelect = page.getByRole('combobox', { name: 'Executor', exact: true })
    await expect(executorSelect.locator('option', { hasText: 'Riley Junior' })).toHaveCount(0)
    await expect(executorSelect.locator('option', { hasText: 'Sam Spouse' })).toHaveCount(1)
    await executorSelect.selectOption({ label: 'Sam Spouse' })
    await expect(page.getByLabel(/don't make my executor buy a bond/i)).toBeChecked()
    await page.getByRole('button', { name: /continue/i }).click()

    // Guardian step appears because Riley is a minor
    await expect(page.getByRole('heading', { name: /who raises your children/i })).toBeVisible()
    await page.getByRole('combobox', { name: 'Guardian', exact: true }).selectOption({ label: 'Sam Spouse' })
    await page.getByRole('button', { name: /continue/i }).click()

    // A specific gift
    await expect(page.getByRole('heading', { name: /any specific gifts/i })).toBeVisible()
    await page.getByRole('button', { name: /add a gift/i }).click()
    await page.getByLabel(/^what$/i).fill("my grandmother's ring")
    await page.getByLabel(/to whom/i).selectOption({ label: 'Riley Junior' })
    await page.getByRole('button', { name: /continue/i }).click()

    // Residuary: spouse first, then children
    await expect(page.getByRole('heading', { name: /who gets everything else/i })).toBeVisible()
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()

    // Review & finish
    await expect(page.getByRole('heading', { name: /almost there/i })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Executor:' })).toContainText('Sam')
    await page.getByRole('button', { name: /finish my will/i }).click()

    // --- Document ---
    await expect(page).toHaveURL(/\/will\/document$/)
    await expect(page.getByRole('heading', { name: /your will is drafted/i })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /last will and testament of taylor testator/i }),
    ).toBeVisible()
    const doc = page.locator('.legal-document')
    await expect(doc).toContainText('I appoint Sam Spouse as Executor')
    await expect(doc).toContainText('No Executor shall be required to post bond')
    await expect(doc).toContainText('guardian of the person and property of my minor children')
    await expect(doc).toContainText("my grandmother's ring")
    await expect(doc).toContainText('rest and residue of my estate to my spouse')
    await expect(doc).not.toContainText('DRAFT')
    await expect(page.getByText(/how to make it legal in CA/i)).toBeVisible()
    await expect(page.getByText(/notarization does NOT replace witnesses/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /print/i })).toBeVisible()

    // --- Dashboard reflects the drafted (but unsigned) will ---
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/a changed will must be signed again/i)).toBeVisible()
    await expect(page.getByText(/print it and sign with witnesses/i)).toBeVisible()
    // household + family + will drafted = 3/9 → 33%; signing still pending
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /33 percent/,
    )
  })

  test('custom split enforces percentages totalling 100', async ({ page }) => {
    await setUpHousehold(page)

    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await page.getByLabel(/this will is for/i).selectOption({ label: 'Taylor Testator' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Sam Spouse' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('combobox', { name: 'Guardian', exact: true }).selectOption({ label: 'Sam Spouse' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click() // skip gifts

    await page.getByRole('radio', { name: /let me split it myself/i }).check()
    await page.getByRole('button', { name: /add a beneficiary/i }).click()
    await page.getByRole('combobox', { name: 'Beneficiary', exact: true }).selectOption({ label: 'Sam Spouse' })
    await page.getByRole('spinbutton', { name: /share/i }).fill('60')
    await expect(page.getByText(/they must add up to 100%/i)).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()

    await expect(page.getByRole('alert')).toContainText(/100%/)
    await expect(page).toHaveURL(/\/will$/)
  })
})
