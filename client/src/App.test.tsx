import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    // No backend in unit tests: /api/auth/me fails → the auth screen shows
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
  })

  it('greets a signed-out visitor with the account screen', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: /plan for the people you love/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows the UPL disclosure before login', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/not legal advice/i)).toBeInTheDocument()
  })
})
