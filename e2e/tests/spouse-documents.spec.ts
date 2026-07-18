import { expect, test } from '@playwright/test'
import { addFamily, onboard, today } from './helpers'

test.describe('Per-person documents', () => {
  test('each spouse makes their own will and the vault tracks both', async ({ page }) => {
    await onboard(page, {
      planName: 'Two Wills Household',
      firstName: 'Morgan',
      lastName: 'Planner',
      dob: '1972-03-15',
      state: 'CA',
      maritalStatus: 'Married',
    })
    await addFamily(page, [{ first: 'Jesse', last: 'Planner', role: 'Spouse', dob: '1974-07-20' }])

    // --- Morgan's will (default: the plan owner) ---
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await expect(page.getByRole('tab', { name: /morgan planner \(you\)/i })).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click() // no gifts
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()
    await expect(
      page.getByRole('heading', { name: /last will and testament of morgan planner/i }),
    ).toBeVisible()
    await expect(page.locator('.legal-document')).toContainText('I appoint Jesse Planner as Executor')

    // --- Switch to Jesse's will via the person tabs: it's a fresh draft ---
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await page.getByRole('tab', { name: /jesse planner/i }).click()
    await expect(page.getByRole('combobox', { name: /this will is for/i })).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()
    // Jesse's executor is Morgan — the mirror image
    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Morgan Planner' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click() // no gifts
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()
    await expect(
      page.getByRole('heading', { name: /last will and testament of jesse planner/i }),
    ).toBeVisible()
    await expect(page.locator('.legal-document')).toContainText('I appoint Morgan Planner as Executor')

    // Sign Jesse's will from the document page we're already on
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByLabel(/witness 1/i).fill('Wanda Witness')
    await page.getByLabel(/witness 2/i).fill('Wesley Witness')
    await page.getByLabel(/where is the signed original/i).fill('Desk drawer')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()

    // --- Morgan's will is untouched by Jesse's signing ---
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await expect(page.getByRole('tab', { name: /morgan planner \(you\)/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByText(/this will has been signed/i)).not.toBeVisible()

    // --- The vault lists both wills, labeled by owner ---
    await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click()
    await expect(
      page.getByRole('cell', { name: 'Last will and testament — Morgan Planner' }),
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Last will and testament — Jesse Planner' }),
    ).toBeVisible()
    const jesseRow = page.getByRole('row', { name: /jesse planner/i })
    await expect(jesseRow.getByRole('cell', { name: 'Signed', exact: true })).toBeVisible()

    // --- Jesse also gets her own POA, independent of Morgan's ---
    await page.getByRole('navigation').getByRole('link', { name: 'Power of attorney' }).click()
    await page.getByRole('tab', { name: /jesse planner/i }).click()
    await page.getByRole('combobox', { name: 'Financial agent', exact: true }).selectOption({ label: 'Morgan Planner' })
    await page.getByRole('button', { name: /finish & preview document/i }).click()
    await expect(
      page.getByRole('heading', { name: /durable power of attorney of jesse planner/i }),
    ).toBeVisible()
    await expect(page.locator('.legal-document')).toContainText('appoint Morgan Planner as my agent')
  })
})
