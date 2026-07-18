import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { PERSON_ROLE_LABELS, type Person, type PersonRole } from '../types'

const EMPTY_FORM = { firstName: '', lastName: '', role: 'Spouse' as PersonRole, dateOfBirth: '' }

export function Family({ householdId }: { householdId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const hasSelf = people.some((p) => p.role === 'Self')

  const reload = useCallback(
    () =>
      api
        .listPeople(householdId)
        .then(setPeople)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load family')),
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

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditForm({
      firstName: person.firstName,
      lastName: person.lastName,
      role: person.role,
      dateOfBirth: person.dateOfBirth ?? '',
    })
  }

  async function saveEdit(personId: string) {
    setError(null)
    try {
      await api.updatePerson(householdId, personId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        dateOfBirth: editForm.dateOfBirth || null,
      })
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes')
    }
  }

  async function remove(personId: string) {
    setError(null)
    try {
      await api.deletePerson(householdId, personId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove person')
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>You &amp; your family</h1>
          <p className="subtitle">
            The people your plan protects — and the candidates for roles like guardian, executor,
            and beneficiary.
          </p>
        </div>
      </header>

      {!hasSelf && (
        <aside className="banner warning" role="note">
          <strong>You're not in your own plan yet.</strong> This is <em>your</em> estate plan — add
          yourself below (choose "Me") so your will, power of attorney, and other documents can be
          made for you.
        </aside>
      )}

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
              {Object.entries(PERSON_ROLE_LABELS)
                .filter(([value]) => value !== 'Self' || !hasSelf)
                .map(([value, label]) => (
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
              {people.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} className="editing-row">
                    <td>
                      <div className="edit-name">
                        <input
                          aria-label="Edit first name"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        />
                        <input
                          aria-label="Edit last name"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        aria-label="Edit relationship"
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm({ ...editForm, role: e.target.value as PersonRole })
                        }
                      >
                        {Object.entries(PERSON_ROLE_LABELS)
                          .filter(([value]) => value !== 'Self' || !hasSelf || p.role === 'Self')
                          .map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label="Edit date of birth"
                        type="date"
                        value={editForm.dateOfBirth}
                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      />
                    </td>
                    <td className="row-actions">
                      <button className="link" onClick={() => saveEdit(p.id)}>
                        Save
                      </button>
                      <button className="link" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>
                      {p.firstName} {p.lastName}
                      {p.role === 'Self' && <span className="badge designated me-badge">You</span>}
                    </td>
                    <td>{PERSON_ROLE_LABELS[p.role]}</td>
                    <td>{p.dateOfBirth ?? '—'}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button className="link danger" onClick={() => remove(p.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
