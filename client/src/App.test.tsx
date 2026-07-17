import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('sends a new visitor to the welcome page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /plan for the people you love/i }),
    ).toBeInTheDocument()
  })

  it('shows the UPL disclosure on the welcome page', () => {
    render(
      <MemoryRouter initialEntries={['/welcome']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument()
  })
})
