import { expect, test } from '@playwright/test'

test.describe('Phase 1: know your estate', () => {
  test('new user onboards, adds family and assets, and watches readiness grow', async ({ page }) => {
    // --- Welcome / onboarding ---
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByRole('heading', { name: /plan for the people you love/i })).toBeVisible()
    await expect(page.getByText(/not legal advice/i)).toBeVisible()

    await page.getByLabel(/what should we call your plan/i).fill('The Playwright Family')
    await page.getByLabel(/where do you live/i).selectOption('CA')
    await page.getByLabel(/marital status/i).selectOption('Married')
    await page.getByRole('button', { name: /start my plan/i }).click()

    // --- Dashboard: fresh plan ---
    await expect(page.getByRole('heading', { name: 'The Playwright Family' })).toBeVisible()
    await expect(page.getByText(/planning under CA law/i).first()).toBeVisible()
    const initialScore = page.getByRole('img', { name: /estate readiness/i })
    await expect(initialScore).toHaveAccessibleName(/14 percent/)

    // --- Family: add a spouse and a minor child ---
    await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await page.getByLabel(/first name/i).fill('Jamie')
    await page.getByLabel(/last name/i).fill('Playwright')
    await page.getByLabel(/who are they/i).selectOption('Spouse')
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: 'Jamie Playwright' })).toBeVisible()

    await page.getByLabel(/first name/i).fill('Riley')
    await page.getByLabel(/last name/i).fill('Playwright')
    await page.getByLabel(/who are they/i).selectOption('Child')
    await page.getByLabel(/date of birth/i).fill('2019-03-10')
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: 'Riley Playwright' })).toBeVisible()

    // --- Assets: a retirement account without a beneficiary triggers the warning ---
    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    await page.getByLabel(/^name$/i).fill('Vanguard 401(k)')
    await page.getByLabel(/category/i).selectOption('Retirement')
    await page.getByLabel(/estimated value/i).fill('250000')
    await page.getByLabel(/beneficiary on file/i).selectOption('None')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name: 'Vanguard 401(k)' })).toBeVisible()
    await expect(page.getByText(/1 account without a confirmed beneficiary/i)).toBeVisible()
    await expect(page.getByText(/designations override your will/i).first()).toBeVisible()

    // Add the family home and the mortgage against it
    await page.getByLabel(/^name$/i).fill('Family home')
    await page.getByLabel(/category/i).selectOption('RealEstate')
    await page.getByLabel(/estimated value/i).fill('600000')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name: 'Family home' })).toBeVisible()
    await page.getByLabel(/^name$/i).fill('Mortgage')
    await page.getByLabel(/category/i).selectOption('Debt')
    await page.getByLabel(/estimated value/i).fill('350000')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByRole('cell', { name: 'Mortgage' })).toBeVisible()

    // --- Dashboard: net estate is right, guardianship flagged, score grew ---
    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByTestId('net-estate')).toHaveText('$500,000')
    await expect(page.getByText(/includes minor children/i)).toBeVisible()
    // household + family + assets done, beneficiaries still pending = 3/7 → 43%
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /43 percent/,
    )
    await expect(page.getByText(/next up:/i)).toContainText(/beneficiary/i)

    // --- Fix the beneficiary and watch readiness climb to 57% ---
    await page.getByRole('navigation').getByRole('link', { name: /assets & debts/i }).click()
    await page.getByRole('row', { name: /vanguard/i }).getByRole('button', { name: /remove/i }).click()
    await page.getByLabel(/^name$/i).fill('Vanguard 401(k)')
    await page.getByLabel(/category/i).selectOption('Retirement')
    await page.getByLabel(/estimated value/i).fill('250000')
    await page.getByLabel(/beneficiary on file/i).selectOption('Designated')
    await page.getByRole('textbox', { name: /beneficiary name/i }).fill('Jamie Playwright')
    await page.getByRole('button', { name: /add to inventory/i }).click()
    await expect(page.getByText(/without a confirmed beneficiary/i)).not.toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('img', { name: /estate readiness/i })).toHaveAccessibleName(
      /57 percent/,
    )
    await expect(page.getByText(/next up:/i)).toContainText(/will/i)
  })

  test('will checklist item mentions guardianship when there are minor children', async ({
    page,
  }) => {
    await page.goto('/welcome')
    await page.getByLabel(/what should we call your plan/i).fill('Guardianship Check')
    await page.getByLabel(/where do you live/i).selectOption('TX')
    await page.getByRole('button', { name: /start my plan/i }).click()
    await expect(page.getByRole('heading', { name: 'Guardianship Check' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await page.getByLabel(/first name/i).fill('Casey')
    await page.getByLabel(/last name/i).fill('Junior')
    await page.getByLabel(/who are they/i).selectOption('Child')
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: 'Casey Junior' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText(/your will should also name a guardian/i)).toBeVisible()
  })
})
