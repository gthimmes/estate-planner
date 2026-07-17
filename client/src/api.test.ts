import { describe, expect, it } from 'vitest'
import { formatCurrency } from './api'

describe('formatCurrency', () => {
  it('formats whole dollars without cents', () => {
    expect(formatCurrency(250_000)).toBe('$250,000')
  })

  it('formats negative net estates', () => {
    expect(formatCurrency(-110_000)).toBe('-$110,000')
  })
})
