import type { Person } from '../types'

export function PersonSelect({
  people,
  value,
  onChange,
  exclude = [],
  allowNone = true,
  noneLabel = 'Not chosen yet',
}: {
  people: Person[]
  value: string | null
  onChange: (id: string | null) => void
  exclude?: (string | null)[]
  allowNone?: boolean
  noneLabel?: string
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowNone && <option value="">{noneLabel}</option>}
      {people
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.firstName} {p.lastName}
          </option>
        ))}
    </select>
  )
}
