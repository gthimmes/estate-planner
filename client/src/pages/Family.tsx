import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { PERSON_ROLE_LABELS, type Person, type PersonRole } from '../types'

const EMPTY_FORM = { firstName: '', lastName: '', role: 'Spouse' as PersonRole, dateOfBirth: '' }

export function Family({ householdId }: { householdId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () => api.listPeople(householdId).then(setPeople).catch(() => setError('Failed to load family')),
    [householdId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.createPerson(householdId, {
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        dateOfBirth: form.dateOfBirth || null,
      })
      setForm(EMPTY_FORM)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add person')
    }
  }

  async function remove(personId: string) {
    await api.deletePerson(householdId, personId)
    await reload()
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Your family</h1>
          <p className="subtitle">
            The people your plan protects — and the candidates for roles like guardian, executor,
            and beneficiary.
          </p>
        </div>
      </header>

      <section className="card">
        <h2>Add someone</h2>
        <form onSubmit={onSubmit} className="inline-form" aria-label="Add a person">
          <label>
            First name
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </label>
          <label>
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </label>
          <label>
            Who are they?
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as PersonRole })}
            >
              {Object.entries(PERSON_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date of birth {form.role === 'Child' ? '(so we know if a guardian is needed)' : '(optional)'}
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </label>
          <button type="submit">Add person</button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>In your plan ({people.length})</h2>
        {people.length === 0 ? (
          <p className="empty">No one yet. Start with yourself, then add your spouse and children.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Relationship</th>
                <th>Date of birth</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.firstName} {p.lastName}
                  </td>
                  <td>{PERSON_ROLE_LABELS[p.role]}</td>
                  <td>{p.dateOfBirth ?? '—'}</td>
                  <td>
                    <button className="link danger" onClick={() => remove(p.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
