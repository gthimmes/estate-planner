import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import {
  VAULT_CATEGORY_LABELS,
  type VaultItemCategory,
  type VaultSummary,
} from '../types'

const EMPTY_FORM = { name: '', category: 'PropertyDeed' as VaultItemCategory, location: '', notes: '' }

const STATUS_LABELS: Record<string, string> = {
  NotStarted: 'Not started',
  Draft: 'In progress',
  Complete: 'Drafted — needs signing',
  Executed: 'Signed',
}

export function Vault({ householdId }: { householdId: string }) {
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () => api.getVault(householdId).then(setVault).catch(() => setError('Failed to load vault')),
    [householdId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!vault) return <p className="loading">Loading your vault…</p>

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.createVaultItem(householdId, {
        name: form.name,
        category: form.category,
        location: form.location || null,
        notes: form.notes || null,
      })
      setForm(EMPTY_FORM)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add item')
    }
  }

  async function remove(itemId: string) {
    await api.deleteVaultItem(householdId, itemId)
    await reload()
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Your vault</h1>
          <p className="subtitle">
            One place that answers the question your family will ask: "where is everything?" Your
            documents, and pointers to everything else — deeds, policies, passwords, final wishes.
          </p>
        </div>
      </header>

      <section className="card">
        <h2>Your documents</h2>
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Status</th>
              <th>Signed</th>
              <th>Where's the original?</th>
            </tr>
          </thead>
          <tbody>
            {vault.documents.map((doc) => (
              <tr key={doc.key}>
                <td>{doc.title}</td>
                <td>
                  <span className={`badge ${doc.status === 'Executed' ? 'designated' : 'none'}`}>
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </span>
                </td>
                <td>{doc.executedOn ?? '—'}</td>
                <td>{doc.storageLocation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Add a pointer</h2>
        <p className="hint">
          Deeds, insurance policies, your password manager, funeral wishes, letters — record where
          they live so your executor doesn't have to hunt.
        </p>
        <form onSubmit={onSubmit} className="inline-form" aria-label="Add a vault item">
          <label>
            What is it?
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. House deed"
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as VaultItemCategory })}
            >
              {Object.entries(VAULT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Where is it?
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. safe deposit box #12 at First National"
            />
          </label>
          <label>
            Notes
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="anything your executor should know"
            />
          </label>
          <button type="submit">Add to vault</button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Pointers ({vault.items.length})</h2>
        {vault.items.length === 0 ? (
          <p className="empty">Nothing yet. Start with your deed, insurance, and password manager.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th>Notes</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {vault.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{VAULT_CATEGORY_LABELS[item.category]}</td>
                  <td>{item.location ?? '—'}</td>
                  <td>{item.notes ?? '—'}</td>
                  <td>
                    <button className="link danger" onClick={() => remove(item.id)}>
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
