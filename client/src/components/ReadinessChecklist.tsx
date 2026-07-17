import { Link } from 'react-router-dom'
import type { ReadinessItem } from '../types'

const ITEM_ROUTES: Record<string, string> = {
  family: '/family',
  assets: '/assets',
  beneficiaries: '/assets',
  will: '/will',
}

export function ReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="checklist">
      {items.map((item) => {
        const route = ITEM_ROUTES[item.key]
        return (
          <li key={item.key} className={item.done ? 'done' : 'todo'}>
            <span className="check" aria-hidden="true">
              {item.done ? '✓' : '○'}
            </span>
            <div>
              <p className="label">
                {route && !item.done ? <Link to={route}>{item.label}</Link> : item.label}
              </p>
              <p className="detail">{item.detail}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
