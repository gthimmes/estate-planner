import { expect, test } from '@playwright/test'
import { addFamily, onboard, today } from './helpers'

/**
 * The whole-application proof: one user goes from nothing to a complete,
 * signed estate plan — will, living trust, financial POA, and healthcare
 * directive — with every page exercised and the readiness score at 100%.
 */
test.describe('The complete plan', () => {
  test('a real person builds and signs their entire estate plan', async ({ page }) => {
    // ---------- Onboarding: the plan starts with YOU ----------
    await onboard(page, {
      planName: "Morgan's estate plan",
      firstName: 'Morgan',
      lastName: 'Planner',
      dob: '1972-03-15',
      state: 'CA',
      maritalStatus: 'Married',
    })

    // ---------- Family: you are already in the plan; add everyone else ----------
    await addFamily(page, [
      { first: 'Jesse', last: 'Planner', role: 'Spouse', dob: '1974-07-20' },
      { first: 'Drew', last: 'Planner', role: 'Child', dob: '2001-02-10' }, // adult child
      { first: 'Quinn', last: 'Planner', role: 'Child', dob: '2016-11-05' }, // minor child
      { first: 'Robin', last: 'Friend', role: 'Other', dob: '1970-01-01' },
    ])
    await expect(page.getByRole('cell', { name: 'Morgan Planner You' })).toBeVisible()

    // Edit a family member and verify the change sticks
    await page
      .getByRole('row', { name: /robin friend/i })
      .getByRole('button', { name: /edit/i })
      .click()
    await page.getByLabel(/edit first name/i).fill('Robyn')
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByRole('cell', { name: 'Robyn Friend' })).toBeVisible()

    // ---------- Assets: what you own and owe ----------
    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    const addAsset = async (
      name: string,
      category: string,
      value: string,
      beneficiary?: 'None' | 'Designated',
      beneficiaryName?: string,
    ) => {
      await page.getByLabel(/^name$/i).fill(name)
      await page.getByLabel(/category/i).selectOption(category)
      await page.getByLabel(/estimated value/i).fill(value)
      if (beneficiary) {
        await page.getByLabel(/beneficiary on file/i).selectOption(beneficiary)
        if (beneficiary === 'Designated' && beneficiaryName) {
          await page.getByRole('textbox', { name: /beneficiary name/i }).fill(beneficiaryName)
        }
      }
      await page.getByRole('button', { name: /add to inventory/i }).click()
      await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
    }
    await addAsset('Family home', 'RealEstate', '650000')
    await addAsset('Vanguard 401(k)', 'Retirement', '380000', 'Designated', 'Jesse Planner')
    await addAsset('Joint checking', 'BankAccount', '40000', 'Designated', 'Jesse Planner')
    await addAsset('Mortgage', 'Debt', '280000')

    // ---------- Dashboard checkpoint: numbers are honest ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByTestId('net-estate')).toHaveText('$790,000')
    await expect(page.getByText(/\$650,000 would go through probate today/i)).toBeVisible()
    await expect(page.getByText(/includes minor children/i)).toBeVisible()
    // household + family + assets + beneficiaries = 4/9 → 44%
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /44 percent/,
    )

    // ---------- The will ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    // The testator defaults to YOU — no hunting required
    await expect(page.getByRole('combobox', { name: /this will is for/i })).toHaveValue(/.+/)
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page
      .getByRole('combobox', { name: 'Backup executor (recommended)', exact: true })
      .selectOption({ label: 'Drew Planner' })
    await page.getByRole('button', { name: /continue/i }).click()

    // Guardian step exists because Quinn is a minor
    await page.getByRole('combobox', { name: 'Guardian', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page
      .getByRole('combobox', { name: 'Backup guardian (recommended)', exact: true })
      .selectOption({ label: 'Robyn Friend' })
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByRole('button', { name: /add a gift/i }).click()
    await page.getByLabel(/^what$/i).fill('my watch collection')
    await page.getByLabel(/to whom/i).selectOption({ label: 'Drew Planner' })
    await page.getByRole('button', { name: /continue/i }).click()

    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()

    // The generated will contains every provision
    await expect(page).toHaveURL(/\/will\/document$/)
    const willDoc = page.locator('.legal-document')
    await expect(
      page.getByRole('heading', { name: /last will and testament of morgan planner/i }),
    ).toBeVisible()
    await expect(willDoc).toContainText('I, Morgan Planner, a resident of the State of CA')
    await expect(willDoc).toContainText('I am married to Jesse Planner.')
    await expect(willDoc).toContainText('Drew Planner, Quinn Planner')
    await expect(willDoc).toContainText('I appoint Jesse Planner as Executor')
    await expect(willDoc).toContainText('I appoint Drew Planner as successor Executor')
    await expect(willDoc).toContainText('No Executor shall be required to post bond')
    await expect(willDoc).toContainText('I nominate Jesse Planner as guardian')
    await expect(willDoc).toContainText('I nominate Robyn Friend as successor guardian')
    await expect(willDoc).toContainText('my watch collection to Drew Planner')
    await expect(willDoc).toContainText('rest and residue of my estate to my spouse, Jesse Planner')
    // Accounts with beneficiaries are flagged as passing outside the will
    await expect(page.getByText(/"Vanguard 401\(k\)" passes directly/i)).toBeVisible()

    // Sign the will
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByLabel(/witness 1/i).fill('Nora Neighbor')
    await page.getByLabel(/witness 2/i).fill('Omar Colleague')
    await page.getByLabel(/where is the signed original/i).fill('Fireproof safe, home office')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()

    // ---------- Financial power of attorney ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Power of attorney' }).click()
    // Principal defaults to you
    await expect(page.getByRole('combobox', { name: 'This document is for', exact: true })).toHaveValue(/.+/)
    await page.getByRole('combobox', { name: 'Financial agent', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page.getByRole('button', { name: /finish & preview document/i }).click()
    await expect(
      page.getByRole('heading', { name: /durable power of attorney of morgan planner/i }),
    ).toBeVisible()
    await expect(page.locator('.legal-document')).toContainText('appoint Jesse Planner as my agent')
    await expect(page.locator('.legal-document')).toContainText('effective immediately')
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByText(new RegExp(`signed on ${today()}`, 'i'))).toBeVisible()

    // ---------- Healthcare directive (living will) ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Healthcare wishes' }).click()
    await page.getByRole('combobox', { name: 'Healthcare agent', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page.getByRole('radio', { name: /don't prolong my life/i }).check()
    await page.getByRole('checkbox', { name: /organ donor/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()
    await expect(
      page.getByRole('heading', { name: /advance healthcare directive of morgan planner/i }),
    ).toBeVisible()
    const healthDoc = page.locator('.legal-document')
    await expect(healthDoc).toContainText('appoint Jesse Planner as my healthcare agent')
    await expect(healthDoc).toContainText('I do not want my life prolonged')
    await expect(healthDoc).toContainText('relief of pain')
    await expect(healthDoc).toContainText('HIPAA')
    await expect(healthDoc).toContainText('donate any organs')
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByText(/editing below revokes the signing record/i)).toBeVisible()

    // ---------- Living trust ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Living trust' }).click()
    await page.getByRole('combobox', { name: 'Successor trustee', exact: true }).selectOption({ label: 'Jesse Planner' })
    await page.getByRole('radio', { name: /everything to my spouse/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()
    await expect(page.getByRole('heading', { name: /the morgan planner living trust/i })).toBeVisible()
    await page.getByLabel(/date signed/i).fill(today())
    await page.getByRole('button', { name: /i signed it/i }).click()

    // Fund the home; the trust document's Schedule A updates
    const fundingBox = page.getByRole('checkbox', { name: /family home/i })
    await fundingBox.click()
    await expect(fundingBox).toBeChecked()
    await expect(page.locator('.legal-document')).toContainText('• Family home (RealEstate)')

    // ---------- Vault: everything findable ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click()
    const signedBadges = page.getByRole('cell', { name: 'Signed', exact: true })
    await expect(signedBadges).toHaveCount(4) // will, trust, POA, healthcare — all signed
    await page.getByLabel(/what is it/i).fill('House deed')
    await page.getByLabel(/category/i).selectOption('PropertyDeed')
    await page.getByLabel(/where is it/i).fill('County recorder + copy in the safe')
    await page.getByRole('button', { name: /add to vault/i }).click()
    await expect(page.getByRole('cell', { name: 'House deed' })).toBeVisible()

    // ---------- Persistence: reload and nothing is lost ----------
    await page.reload()
    await expect(page.getByRole('heading', { name: /your vault/i })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'House deed' })).toBeVisible()

    // ---------- Final dashboard: a complete plan ----------
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /100 percent/,
    )
    await expect(page.getByText(/everything on your checklist is done/i)).toBeVisible()
    await expect(page.getByText(/would go through probate today/i)).not.toBeVisible()
    // Every checklist item is checked
    const checklistItems = page.locator('.checklist li')
    await expect(checklistItems).toHaveCount(9)
    await expect(page.locator('.checklist li.done')).toHaveCount(9)
  })
})
