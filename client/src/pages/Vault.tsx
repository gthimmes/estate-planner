import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import {
  VAULT_CATEGORY_LABELS,
  type VaultFileMeta,
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
  const [files, setFiles] = useState<VaultFileMeta[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reload = useCallback(
    () =>
      Promise.all([api.getVault(householdId), api.listVaultFiles(householdId)])
        .then(([v, f]) => {
          setVault(v)
          setFiles(f)
        })
        .catch(() => setError('Failed to load vault')),
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
        <h2>Signed copies ({files.length})</h2>
        <p className="hint">
          Upload scans or photos of your signed documents (PDF, PNG, or JPEG, up to 15 MB). The
          paper original still matters — this is the backup your family can always find.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          aria-label="Upload a signed copy"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setError(null)
            setUploading(true)
            try {
              await api.uploadVaultFile(householdId, file)
              await reload()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Upload failed')
            } finally {
              setUploading(false)
              if (fileInput.current) fileInput.current.value = ''
            }
          }}
        />
        {files.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <a href={`/api/households/${householdId}/vault/files/${f.id}/download`} download>
                      {f.fileName}
                    </a>
                  </td>
                  <td>{(f.sizeBytes / 1024).toFixed(0)} KB</td>
                  <td>{new Date(f.uploadedAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="link danger"
                      onClick={async () => {
                        await api.deleteVaultFile(householdId, f.id)
                        await reload()
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
