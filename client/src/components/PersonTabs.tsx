import type { Person } from '../types'

/** Switcher between each adult's version of a per-person document. */
export function PersonTabs({
  people,
  activeId,
  onSelect,
  label,
}: {
  people: Person[]
  activeId: string | null
  onSelect: (id: string) => void
  label: string
}) {
  if (people.length < 2) return null
  return (
    <div className="person-tabs no-print" role="tablist" aria-label={label}>
      {people.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === activeId}
          className={p.id === activeId ? 'active' : ''}
          onClick={() => onSelect(p.id)}
        >
          {p.firstName} {p.lastName}
          {p.role === 'Self' ? ' (you)' : ''}
        </button>
      ))}
    </div>
  )
}
