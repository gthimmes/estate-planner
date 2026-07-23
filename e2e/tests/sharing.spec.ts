import { expect, test, type Browser } from '@playwright/test'
import { addFamily, onboard } from './helpers'

async function newVisitor(browser: Browser) {
  const context = await browser.newContext()
  return { context, page: await context.newPage() }
}

test.describe('Sharing with the executor', () => {
  test('owner invites, executor sees the plan read-only, revoke cuts access', async ({
    browser,
  }) => {
    // --- The owner builds a small plan and creates an invite ---
    const owner = await newVisitor(browser)
    await onboard(owner.page, {
      planName: 'Shared Estate',
      firstName: 'Owen',
      lastName: 'Owner',
      dob: '1970-01-01',
      state: 'CA',
      maritalStatus: 'Married',
    })
    await addFamily(owner.page, [{ first: 'Exie', last: 'Cutor', role: 'Other', dob: '1975-05-05' }])

    await owner.page.getByRole('navigation').getByRole('link', { name: 'Sharing' }).click()
    await owner.page.getByLabel(/who is this for/i).fill('My brother the executor')
    await owner.page.getByRole('button', { name: /create invite link/i }).click()
    await expect(owner.page.getByRole('cell', { name: 'My brother the executor' })).toBeVisible()
    await owner.page.getByRole('button', { name: /copy link/i }).click()
    const inviteLink = await owner.page.evaluate(() => navigator.clipboard.readText())
    expect(inviteLink).toContain('/share/')

    // --- The executor registers their own account and opens the link ---
    const executor = await newVisitor(browser)
    await executor.page.goto('/')
    await executor.page.getByRole('tab', { name: /create account/i }).click()
    await executor.page.getByLabel(/email/i).fill(`executor-${Date.now()}@test.local`)
    await executor.page.getByLabel(/password/i).fill('correct-horse-battery')
    await executor.page.getByRole('button', { name: /create my account/i }).click()
    await expect(executor.page.getByLabel(/your first name/i)).toBeVisible()

    await executor.page.goto(inviteLink)
    await expect(executor.page.getByRole('heading', { name: 'Shared Estate' })).toBeVisible()
    await expect(executor.page.getByText(/viewing this plan as/i)).toBeVisible()
    await expect(executor.page.getByText(/read-only/i)).toBeVisible()

    // Read access: family and the executor's guide work
    await executor.page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await expect(executor.page.getByRole('cell', { name: 'Exie Cutor' })).toBeVisible()
    await executor.page
      .getByRole('navigation')
      .getByRole('link', { name: /executor's guide/i })
      .click()
    await expect(
      executor.page.getByRole('heading', { name: /executor's guide — estate of owen owner/i }),
    ).toBeVisible()

    // Write attempts fail politely (server rejects them)
    await executor.page.getByRole('navigation').getByRole('link', { name: 'Family' }).click()
    await executor.page.getByLabel(/first name/i).fill('Not')
    await executor.page.getByLabel(/last name/i).fill('Allowed')
    await executor.page.getByRole('button', { name: /add person/i }).click()
    await expect(executor.page.getByRole('alert')).toBeVisible()

    // The owner sees "Accepted" and revokes; the executor loses access
    await owner.page.reload()
    await expect(owner.page.getByText(/accepted/i)).toBeVisible()
    await owner.page.getByRole('button', { name: /revoke/i }).click()
    await expect(owner.page.getByText(/no invites yet/i)).toBeVisible()

    await executor.page.getByRole('navigation').getByRole('link', { name: 'Dashboard' }).click()
    // The stored plan 404s now; the app recovers to onboarding for their own plan
    await expect(executor.page.getByLabel(/your first name/i)).toBeVisible()

    await owner.context.close()
    await executor.context.close()
  })
})
