import type { ReadinessItem } from '../types'

export function ReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="checklist">
      {items.map((item) => (
        <li key={item.key} className={item.done ? 'done' : 'todo'}>
          <span className="check" aria-hidden="true">
            {item.done ? '✓' : '○'}
          </span>
          <div>
            <p className="label">{item.label}</p>
            <p className="detail">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
