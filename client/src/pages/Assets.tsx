import { useCallback, useEffect, useState } from 'react'
import { api, formatCurrency } from '../api'
import {
  ASSET_CATEGORY_LABELS,
  DESIGNATABLE_CATEGORIES,
  type Asset,
  type AssetCategory,
  type BeneficiaryStatus,
  type Person,
} from '../types'

const EMPTY_FORM = {
  name: '',
  category: 'BankAccount' as AssetCategory,
  estimatedValue: '',
  ownerPersonId: '',
  beneficiaryStatus: 'None' as BeneficiaryStatus,
  beneficiaryName: '',
}

const BENEFICIARY_LABELS: Record<BeneficiaryStatus, string> = {
  NotApplicable: 'Not applicable',
  None: 'No beneficiary named',
  Designated: 'Beneficiary designated',
  NeedsReview: 'Needs review',
}

export function Assets({ householdId }: { householdId: string }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () =>
      Promise.all([api.listAssets(householdId), api.listPeople(householdId)])
        .then(([a, p]) => {
          setAssets(a)
          setPeople(p)
        })
        .catch(() => setError('Failed to load assets')),
    [householdId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  const designatable = DESIGNATABLE_CATEGORIES.includes(form.category)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.createAsset(householdId, {
        name: form.name,
        category: form.category,
        estimatedValue: Number(form.estimatedValue) || 0,
        ownerPersonId: form.ownerPersonId || null,
        beneficiaryStatus: designatable ? form.beneficiaryStatus : 'NotApplicable',
        beneficiaryName: designatable && form.beneficiaryStatus === 'Designated' ? form.beneficiaryName : null,
        notes: null,
      })
      setForm(EMPTY_FORM)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add asset')
    }
  }

  async function remove(assetId: string) {
    await api.deleteAsset(householdId, assetId)
    await reload()
  }

  const needsAttention = assets.filter(
    (a) =>
      DESIGNATABLE_CATEGORIES.includes(a.category) &&
      (a.beneficiaryStatus === 'None' || a.beneficiaryStatus === 'NeedsReview'),
  )

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>What you own &amp; owe</h1>
          <p className="subtitle">
            Your inventory drives everything: what your will covers, what skips probate, and which
            accounts need a beneficiary on file.
          </p>
        </div>
      </header>

      {needsAttention.length > 0 && (
        <aside className="banner warning" role="status">
          <strong>
            {needsAttention.length} {needsAttention.length === 1 ? 'account' : 'accounts'} without a
            confirmed beneficiary.
          </strong>{' '}
          Beneficiary designations override your will — they're worth fixing first.
        </aside>
      )}

      <section className="card">
        <h2>Add an asset or debt</h2>
        <form onSubmit={onSubmit} className="inline-form" aria-label="Add an asset">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Chase checking"
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as AssetCategory })}
            >
              {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estimated value ($)
            <input
              type="number"
              min="0"
              step="1000"
              value={form.estimatedValue}
              onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              required
            />
          </label>
          <label>
            Owner
            <select
              value={form.ownerPersonId}
              onChange={(e) => setForm({ ...form, ownerPersonId: e.target.value })}
            >
              <option value="">Household / joint</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          {designatable && (
            <>
              <label>
                Beneficiary on file?
                <select
                  value={form.beneficiaryStatus}
                  onChange={(e) =>
                    setForm({ ...form, beneficiaryStatus: e.target.value as BeneficiaryStatus })
                  }
                >
                  <option value="None">No beneficiary named</option>
                  <option value="Designated">Yes, designated</option>
                  <option value="NeedsReview">Not sure — needs review</option>
                </select>
              </label>
              {form.beneficiaryStatus === 'Designated' && (
                <label>
                  Beneficiary name
                  <input
                    value={form.beneficiaryName}
                    onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                    placeholder="Who's named on the account?"
                  />
                </label>
              )}
            </>
          )}
          <button type="submit">Add to inventory</button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Inventory ({assets.length})</h2>
        {assets.length === 0 ? (
          <p className="empty">
            Nothing yet. Add your home, accounts, insurance — and debts like a mortgage.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Value</th>
                <th>Beneficiary</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className={a.category === 'Debt' ? 'debt-row' : undefined}>
                  <td>{a.name}</td>
                  <td>{ASSET_CATEGORY_LABELS[a.category]}</td>
                  <td>
                    {a.category === 'Debt' ? '−' : ''}
                    {formatCurrency(a.estimatedValue)}
                  </td>
                  <td>
                    {DESIGNATABLE_CATEGORIES.includes(a.category) ? (
                      <span className={`badge ${a.beneficiaryStatus.toLowerCase()}`}>
                        {BENEFICIARY_LABELS[a.beneficiaryStatus]}
                        {a.beneficiaryStatus === 'Designated' && a.beneficiaryName
                          ? `: ${a.beneficiaryName}`
                          : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button className="link danger" onClick={() => remove(a.id)}>
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
