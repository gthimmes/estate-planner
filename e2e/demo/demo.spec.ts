import { expect, test, type Page } from '@playwright/test'

const today = () => new Date().toISOString().slice(0, 10)

/** Pause so the recording is watchable — every pause is also a stability check. */
async function beat(page: Page, ms = 900) {
  await page.waitForTimeout(ms)
}

/**
 * The recorded demo doubles as top-to-bottom validation: everything asserted
 * here must actually work, on camera, in one continuous session.
 */
test('Estate Planner — full product demo', async ({ page }) => {
  // ---------- Welcome: the plan starts with you ----------
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /plan for the people you love/i })).toBeVisible()
  await beat(page, 1400)
  await page.getByLabel(/your first name/i).pressSequentially('Glenn', { delay: 40 })
  await page.getByLabel(/your last name/i).pressSequentially('Demo', { delay: 40 })
  await page.getByLabel(/your date of birth/i).fill('1974-06-15')
  await page.getByLabel(/where do you live/i).selectOption('CA')
  await page.getByLabel(/marital status/i).selectOption('Married')
  await page.getByLabel(/name your plan/i).pressSequentially('The Demo Family Plan', { delay: 30 })
  await beat(page)
  await page.getByRole('button', { name: /start my plan/i }).click()
  await expect(page.getByRole('heading', { name: 'The Demo Family Plan' })).toBeVisible()
  await beat(page, 1600)

  // ---------- Family ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
  for (const person of [
    { first: 'Sarah', last: 'Demo', role: 'Spouse', dob: '1975-09-19' },
    { first: 'Riley', last: 'Demo', role: 'Child', dob: '2014-03-10' },
  ]) {
    await page.getByLabel(/first name/i).pressSequentially(person.first, { delay: 35 })
    await page.getByLabel(/last name/i).pressSequentially(person.last, { delay: 35 })
    await page.getByLabel(/who are they/i).selectOption(person.role)
    await page.getByLabel(/date of birth/i).fill(person.dob)
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: `${person.first} ${person.last}` })).toBeVisible()
    await beat(page, 700)
  }
  await beat(page)

  // ---------- Assets ----------
  await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
  const addAsset = async (name: string, category: string, value: string, beneficiary?: string) => {
    await page.getByLabel(/^name$/i).pressSequentially(name, { delay: 25 })
    await page.getByLabel(/category/i).selectOption(category)
    await page.getByLabel(/estimated value/i).fill(value)
    if (beneficiary) {
      await page.getByLabel(/beneficiary on file/i).selectOption('Designated')
      await page.getByRole('textbox', { name: /beneficiary name/i }).fill(beneficiary)
    }
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
    await beat(page, 600)
  }
  await addAsset('Family home', 'RealEstate', '750000')
  await addAsset('401(k)', 'Retirement', '400000', 'Sarah Demo')
  await addAsset('Mortgage', 'Debt', '300000')
  await beat(page)

  // ---------- Dashboard: probate exposure + readiness ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByTestId('net-estate')).toHaveText('$850,000')
  await expect(page.getByText(/\$750,000 would go through probate today/i)).toBeVisible()
  await beat(page, 2200)

  // ---------- The will ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
  await beat(page)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Sarah Demo' })
  await beat(page, 700)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('combobox', { name: 'Guardian', exact: true }).selectOption({ label: 'Sarah Demo' })
  await beat(page, 700)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('button', { name: /continue/i }).click() // no specific gifts
  await page.getByRole('radio', { name: /everything to my spouse/i }).check()
  await beat(page, 700)
  await page.getByRole('button', { name: /continue/i }).click()
  await beat(page)
  await page.getByRole('button', { name: /finish my will/i }).click()
  await expect(
    page.getByRole('heading', { name: /last will and testament of glenn demo/i }),
  ).toBeVisible()
  await beat(page, 2400)

  // Sign it — with a typed e-signature from the InkWell-ported pad
  await page.getByLabel(/date signed/i).fill(today())
  await page.getByLabel(/witness 1/i).fill('Nora Neighbor')
  await page.getByLabel(/witness 2/i).fill('Omar Colleague')
  await page.getByLabel(/where is the signed original/i).fill('Fireproof safe, home office')
  await page.getByRole('button', { name: /add e-signature/i }).click()
  await beat(page)
  await page.getByRole('tab', { name: 'Type', exact: true }).click()
  await page.getByRole('textbox', { name: /type your name/i }).fill('Glenn Demo')
  await beat(page, 1200)
  await page.getByRole('button', { name: /apply signature/i }).click()
  await expect(page.getByAltText(/your adopted signature/i)).toBeVisible()
  await beat(page)
  await page.getByRole('button', { name: /i signed it/i }).click()
  await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()
  await expect(page.locator('.signing-record')).toContainText(/SHA-256/)
  await beat(page, 2400)

  // ---------- Power of attorney ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Power of attorney' }).click()
  await page.getByRole('combobox', { name: 'Financial agent', exact: true }).selectOption({ label: 'Sarah Demo' })
  await beat(page, 700)
  await page.getByRole('button', { name: /finish & preview document/i }).click()
  await expect(
    page.getByRole('heading', { name: /durable power of attorney of glenn demo/i }),
  ).toBeVisible()
  await beat(page, 1600)
  await page.getByLabel(/date signed/i).fill(today())
  await page.getByRole('button', { name: /i signed it/i }).click()
  await expect(page.getByText(new RegExp(`signed on ${today()}`, 'i'))).toBeVisible()
  await beat(page, 1200)

  // ---------- Healthcare directive ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Healthcare wishes' }).click()
  await page.getByRole('combobox', { name: 'Healthcare agent', exact: true }).selectOption({ label: 'Sarah Demo' })
  await page.getByRole('radio', { name: /don't prolong my life/i }).check()
  await page.getByRole('checkbox', { name: /organ donor/i }).check()
  await beat(page, 900)
  await page.getByRole('button', { name: /finish & preview document/i }).click()
  await expect(
    page.getByRole('heading', { name: /advance healthcare directive of glenn demo/i }),
  ).toBeVisible()
  await beat(page, 1600)
  await page.getByLabel(/date signed/i).fill(today())
  await page.getByRole('button', { name: /i signed it/i }).click()
  await expect(page.getByText(/editing below revokes the signing record/i)).toBeVisible()
  await beat(page, 1200)

  // ---------- Living will ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Living will' }).click()
  await page.getByRole('radio', { name: /don't prolong my life/i }).check()
  await page.getByRole('checkbox', { name: /organ donor/i }).check()
  await beat(page, 900)
  await page.getByRole('button', { name: /finish & preview document/i }).click()
  await expect(page.getByRole('heading', { name: /living will of glenn demo/i })).toBeVisible()
  await beat(page, 1600)
  await page.getByLabel(/date signed/i).fill(today())
  await page.getByRole('button', { name: /i signed it/i }).click()
  await expect(page.getByText(/editing below revokes the signing record/i)).toBeVisible()
  await beat(page, 1200)

  // ---------- Living trust + funding ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Living trust' }).click()
  await page.getByRole('combobox', { name: 'Successor trustee', exact: true }).selectOption({ label: 'Sarah Demo' })
  await page.getByRole('radio', { name: /everything to my spouse/i }).check()
  await beat(page, 700)
  await page.getByRole('button', { name: /finish & preview document/i }).click()
  await expect(page.getByRole('heading', { name: /the glenn demo living trust/i })).toBeVisible()
  await beat(page, 1400)
  await page.getByLabel(/date signed/i).fill(today())
  await page.getByRole('button', { name: /i signed it/i }).click()
  const fundingBox = page.getByRole('checkbox', { name: /family home/i })
  await fundingBox.click()
  await expect(fundingBox).toBeChecked()
  await expect(page.locator('.legal-document')).toContainText('• Family home (RealEstate)')
  await beat(page, 1800)

  // ---------- Vault: everything signed and findable ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click()
  await expect(page.getByRole('cell', { name: 'Signed', exact: true })).toHaveCount(5)
  await beat(page, 2400)

  // ---------- Final dashboard: 100% ready, zero probate exposure ----------
  await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
    /100 percent/,
  )
  await expect(page.getByText(/would go through probate today/i)).not.toBeVisible()
  await beat(page, 3200)
})
