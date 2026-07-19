import { expect, type Page } from '@playwright/test'

export interface OnboardOptions {
  planName: string
  firstName: string
  lastName: string
  dob: string
  state: string
  maritalStatus?: 'Single' | 'Married' | 'DomesticPartnership' | 'Divorced' | 'Widowed'
}

/** Creates a fresh account; the cookie session sticks to the page context. */
export async function registerAccount(page: Page) {
  await page.goto('/')
  await page.getByRole('tab', { name: /create account/i }).click()
  await page.getByLabel(/email/i).fill(`e2e-${Date.now()}-${Math.floor(Math.random() * 1e9)}@test.local`)
  await page.getByLabel(/password/i).fill('correct-horse-battery')
  await page.getByRole('button', { name: /create my account/i }).click()
  // No household yet → the app routes to onboarding
  await expect(page.getByLabel(/your first name/i)).toBeVisible()
}

/** Registers an account, then runs the welcome flow. The person entered becomes the plan's Self. */
export async function onboard(page: Page, opts: OnboardOptions) {
  await registerAccount(page)
  await page.getByLabel(/your first name/i).fill(opts.firstName)
  await page.getByLabel(/your last name/i).fill(opts.lastName)
  await page.getByLabel(/your date of birth/i).fill(opts.dob)
  await page.getByLabel(/where do you live/i).selectOption(opts.state)
  await page.getByLabel(/marital status/i).selectOption(opts.maritalStatus ?? 'Married')
  await page.getByLabel(/name your plan/i).fill(opts.planName)
  await page.getByRole('button', { name: /start my plan/i }).click()
  await expect(page.getByRole('heading', { name: opts.planName })).toBeVisible()
}

export interface FamilyMember {
  first: string
  last: string
  role: 'Spouse' | 'Child' | 'Other'
  dob?: string
}

export async function addFamily(page: Page, people: FamilyMember[]) {
  await page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
  for (const person of people) {
    await page.getByLabel(/first name/i).fill(person.first)
    await page.getByLabel(/last name/i).fill(person.last)
    await page.getByLabel(/who are they/i).selectOption(person.role)
    if (person.dob) {
      await page.getByLabel(/date of birth/i).fill(person.dob)
    }
    await page.getByRole('button', { name: /add person/i }).click()
    await expect(page.getByRole('cell', { name: `${person.first} ${person.last}` })).toBeVisible()
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
