import { expect, test } from '@playwright/test'
import { onboard, today } from './helpers'

test.describe('Living will with e-signature', () => {
  test('declare end-of-life wishes and e-sign the record', async ({ page }) => {
    await onboard(page, {
      planName: 'Declaration Plan',
      firstName: 'Dee',
      lastName: 'Clarant',
      dob: '1965-05-05',
      state: 'CA',
      maritalStatus: 'Single',
    })

    // --- The living will needs no agent: wishes only ---
    await page.getByRole('navigation').getByRole('link', { name: 'Living will' }).click()
    await expect(page.getByText(/no agent, no decisions delegated/i)).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Healthcare agent' })).not.toBeVisible()
    await page.getByRole('radio', { name: /don't prolong my life/i }).check()
    await page.getByRole('checkbox', { name: /organ donor/i }).check()
    await page.getByRole('button', { name: /finish & preview document/i }).click()

    await expect(page.getByRole('heading', { name: /living will of dee clarant/i })).toBeVisible()
    const doc = page.locator('.legal-document')
    await expect(doc).toContainText('permitted to die naturally')
    await expect(doc).toContainText('relief of pain')
    await expect(doc).toContainText('donate any organs')
    await expect(page.getByText(/two adult witnesses/i)).toBeVisible()

    // --- E-sign: type-mode signature from the ported InkWell pad ---
    await page.getByRole('button', { name: /add e-signature/i }).click()
    await expect(page.getByRole('dialog', { name: /adopt your signature/i })).toBeVisible()
    await page.getByRole('tab', { name: 'Type', exact: true }).click()
    await page.getByRole('textbox', { name: /type your name/i }).fill('Dee Clarant')
    await page.getByRole('button', { name: /apply signature/i }).click()
    await expect(page.getByAltText(/your adopted signature/i)).toBeVisible()

    await page.getByLabel(/date signed/i).fill(today())
    await page.getByRole('button', { name: /i signed it/i }).click()

    // --- The signing record shows the signature and its fingerprint ---
    await expect(page.getByText(/editing below revokes the signing record/i)).toBeVisible()
    const record = page.locator('.signing-record')
    await expect(record).toBeVisible()
    await expect(record.getByAltText(/adopted signature of dee clarant/i)).toBeVisible()
    await expect(record).toContainText(/SHA-256 [0-9a-f]{64}/)

    // --- Vault shows the living will as signed ---
    await page.getByRole('navigation').getByRole('link', { name: 'Vault' }).click()
    const row = page.getByRole('row', { name: /living will/i })
    await expect(row.getByRole('cell', { name: 'Signed', exact: true })).toBeVisible()
  })

  test('drawn signature works on the will signing form', async ({ page }) => {
    await onboard(page, {
      planName: 'Drawn Sig Plan',
      firstName: 'Art',
      lastName: 'Ist',
      dob: '1970-01-01',
      state: 'TX',
      maritalStatus: 'Single',
    })
    // Add an executor candidate
    await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await page.getByLabel(/first name/i).fill('Exe')
    await page.getByLabel(/last name/i).fill('Cutor')
    await page.getByLabel(/who are they/i).selectOption('Other')
    await page.getByLabel(/date of birth/i).fill('1972-02-02')
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: 'Exe Cutor' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Your will' }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('combobox', { name: 'Executor', exact: true }).selectOption({ label: 'Exe Cutor' })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click() // no gifts
    await page.getByRole('radio', { name: /let me split it myself/i }).check()
    await page.getByRole('button', { name: /add a beneficiary/i }).click()
    await page.getByRole('combobox', { name: 'Beneficiary', exact: true }).selectOption({ label: 'Exe Cutor' })
    await page.getByRole('spinbutton', { name: /share/i }).fill('100')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /finish my will/i }).click()
    await expect(page).toHaveURL(/\/will\/document/)

    // Draw a signature with the pointer
    await page.getByRole('button', { name: /add e-signature/i }).click()
    const canvas = page.locator('.sigpad-canvas')
    await expect(canvas).toBeVisible()
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + 40, box.y + 90)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 60, { steps: 8 })
    await page.mouse.move(box.x + 200, box.y + 110, { steps: 8 })
    await page.mouse.move(box.x + 280, box.y + 70, { steps: 8 })
    await page.mouse.up()
    await page.getByRole('button', { name: /apply signature/i }).click()
    await expect(page.getByAltText(/your adopted signature/i)).toBeVisible()

    await page.getByLabel(/date signed/i).fill(today())
    await page.getByLabel(/witness 1/i).fill('Wanda Witness')
    await page.getByLabel(/witness 2/i).fill('Wesley Witness')
    await page.getByLabel(/where is the signed original/i).fill('Desk')
    await page.getByRole('button', { name: /i signed it/i }).click()
    await expect(page.getByRole('heading', { name: /your will is signed/i })).toBeVisible()
    await expect(page.locator('.signing-record')).toContainText(/SHA-256 [0-9a-f]{64}/)
  })
})
