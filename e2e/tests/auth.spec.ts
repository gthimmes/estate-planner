import { expect, test } from '@playwright/test'
import { addFamily, onboard } from './helpers'

test.describe('Accounts', () => {
  test('sign out and back in — the plan survives the round trip', async ({ page }) => {
    // Register with a knowable email so we can log back in
    const email = `roundtrip-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`
    await page.goto('/')
    await page.getByRole('tab', { name: /create account/i }).click()
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill('correct-horse-battery')
    await page.getByRole('button', { name: /create my account/i }).click()
    await expect(page.getByLabel(/your first name/i)).toBeVisible()

    await page.getByLabel(/your first name/i).fill('Round')
    await page.getByLabel(/your last name/i).fill('Trip')
    await page.getByLabel(/your date of birth/i).fill('1980-01-01')
    await page.getByLabel(/where do you live/i).selectOption('CA')
    await page.getByLabel(/name your plan/i).fill('Round Trip Plan')
    await page.getByRole('button', { name: /start my plan/i }).click()
    await expect(page.getByRole('heading', { name: 'Round Trip Plan' })).toBeVisible()

    await addFamily(page, [{ first: 'Steady', last: 'Spouse', role: 'Spouse', dob: '1981-02-02' }])

    // Sign out → back to the account screen
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()

    // Sign back in → same plan, same family
    await page.getByRole('tab', { name: /sign in/i }).click()
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill('correct-horse-battery')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByRole('heading', { name: 'Round Trip Plan' })).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await expect(page.getByRole('cell', { name: 'Steady Spouse' })).toBeVisible()
  })

  test('a wrong password is rejected with a clear message', async ({ page }) => {
    await onboard(page, {
      planName: 'Locked Plan',
      firstName: 'Locke',
      lastName: 'Down',
      dob: '1970-01-01',
      state: 'TX',
      maritalStatus: 'Single',
    })
    await page.getByRole('button', { name: /sign out/i }).click()
    await page.getByRole('tab', { name: /sign in/i }).click()
    await page.getByLabel(/email/i).fill('nobody@test.local')
    await page.getByLabel(/password/i).fill('wrong-password-here')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByRole('alert')).toContainText(/don't match/i)
  })
})
