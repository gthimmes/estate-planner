import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReadinessItem } from '../types'
import { ReadinessChecklist } from './ReadinessChecklist'

const items: ReadinessItem[] = [
  { key: 'family', label: 'Add your loved ones', done: true, detail: '2 people in your plan.' },
  { key: 'will', label: 'Create your will', done: false, detail: 'Coming soon.' },
]

describe('ReadinessChecklist', () => {
  it('renders every item with its detail', () => {
    render(<ReadinessChecklist items={items} />)
    expect(screen.getByText('Add your loved ones')).toBeInTheDocument()
    expect(screen.getByText('2 people in your plan.')).toBeInTheDocument()
    expect(screen.getByText('Create your will')).toBeInTheDocument()
  })

  it('marks completed items as done', () => {
    render(<ReadinessChecklist items={items} />)
    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveClass('done')
    expect(listItems[1]).toHaveClass('todo')
  })
})
