import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ExecutionInstructions, LegalDocumentView } from '../components/LegalDocumentView'
import { PersonSelect } from '../components/PersonSelect'
import { PersonTabs } from '../components/PersonTabs'
import {
  ASSET_CATEGORY_LABELS,
  isMinor,
  type Asset,
  type Person,
  type TrustPlan,
  type TrustPlanInput,
  type WillDocument,
} from '../types'

export function Trust({ householdId }: { householdId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [form, setForm] = useState<TrustPlanInput | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [status, setStatus] = useState<TrustPlan['status']>('Draft')
  const [executedOn, setExecutedOn] = useState<string | null>(null)
  const [render, setRender] = useState<WillDocument | null>(null)
  const [signDate, setSignDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reloadAssets = useCallback(
    () => api.listAssets(householdId).then(setAssets),
    [householdId],
  )

  useEffect(() => {
    Promise.all([
      api.getTrust(householdId, selectedPersonId),
      api.listPeople(householdId),
      api.listAssets(householdId),
    ])
      .then(([trust, ppl, a]) => {
        setPeople(ppl)
        setAssets(a)
        setStatus(trust.status)
        setExecutedOn(trust.executedOn)
        setSelectedPersonId(
          (prev) => prev ?? trust.grantorPersonId ?? ppl.find((p) => p.role === 'Self')?.id ?? null,
        )
        setForm(
          (prev) =>
            prev ?? {
              grantorPersonId: trust.grantorPersonId ?? ppl.find((p) => p.role === 'Self')?.id ?? null,
              successorTrusteePersonId: trust.successorTrusteePersonId,
              backupTrusteePersonId: trust.backupTrusteePersonId,
              distributionStrategy: trust.distributionStrategy,
              distributionShares: trust.distributionShares,
            },
        )
        if (trust.status !== 'Draft') {
          void api.getTrustRender(householdId, trust.grantorPersonId).then(setRender)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId, selectedPersonId])

  function switchPerson(id: string) {
    if (id === selectedPersonId) return
    setForm(null)
    setRender(null)
    setSelectedPersonId(id)
  }

  const adults = useMemo(() => people.filter((p) => !isMinor(p)), [people])
  const hasSpouse = people.some((p) => p.role === 'Spouse')
  const hasChildren = people.some((p) => p.role === 'Child')
  const fundable = assets.filter((a) => a.category !== 'Debt')

  if (error && !form)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!form) return <p className="loading">Loading…</p>

  if (people.length === 0) {
    return (
      <div>
        <header className="page-header">
          <h1>Living trust</h1>
        </header>
        <section className="card">
          <p>First, add the people in your life — you'll pick your successor trustee from them.</p>
          <Link to="/family">Add your family first →</Link>
        </section>
      </div>
    )
  }

  const set = (patch: Partial<TrustPlanInput>) => setForm({ ...form, ...patch })
  const executed = status === 'Executed'

  async function finish() {
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await api.saveTrust(householdId, form)
      const trust = await api.completeTrust(householdId, form.grantorPersonId)
      setStatus(trust.status)
      setRender(await api.getTrustRender(householdId, form.grantorPersonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish')
    } finally {
      setSaving(false)
    }
  }

  async function recordSigning(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      const trust = await api.markTrustExecuted(
        householdId,
        { executedOn: signDate, executionNotes: null },
        form.grantorPersonId,
      )
      setStatus(trust.status)
      setExecutedOn(trust.executedOn)
      setRender(await api.getTrustRender(householdId, form.grantorPersonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record signing')
    } finally {
      setSaving(false)
    }
  }

  async function toggleFunding(asset: Asset) {
    await api.updateAsset(householdId, asset.id, {
      name: asset.name,
      category: asset.category,
      estimatedValue: asset.estimatedValue,
      ownerPersonId: asset.ownerPersonId,
      beneficiaryStatus: asset.beneficiaryStatus,
      beneficiaryName: asset.beneficiaryName,
      heldInTrust: !asset.heldInTrust,
      notes: asset.notes,
    })
    await reloadAssets()
    if (render && form) setRender(await api.getTrustRender(householdId, form.grantorPersonId))
  }

  return (
    <div>
      <header className="page-header no-print">
        <div>
          <h1>Living trust</h1>
          <p className="subtitle">
            A revocable living trust holds your assets during your life and passes them directly to
            your people at death — no probate court for whatever it holds. You stay in full control
            and can change it anytime.
          </p>
        </div>
        {render && (
          <div className="doc-actions">
            <button onClick={() => window.print()}>Print</button>
          </div>
        )}
      </header>

      <PersonTabs
        people={adults}
        activeId={selectedPersonId}
        onSelect={switchPerson}
        label="Whose trust"
      />

      {executed && (
        <aside className="banner success no-print" role="status">
          <strong>Signed on {executedOn}.</strong> Now fund it below — an unfunded trust avoids
          nothing. Editing the trust choices revokes the signing record.
        </aside>
      )}

      <section className="card no-print" aria-label="Trust choices">
        <div className="inline-form">
          <label>
            This trust is for
            <PersonSelect
              people={adults}
              value={form.grantorPersonId}
              onChange={(id) => {
                set({ grantorPersonId: id })
                if (id) switchPerson(id)
              }}
            />
          </label>
          <label>
            Successor trustee
            <PersonSelect
              people={adults}
              value={form.successorTrusteePersonId}
              onChange={(id) => set({ successorTrusteePersonId: id })}
              exclude={[form.grantorPersonId]}
            />
          </label>
          <label>
            Backup trustee (recommended)
            <PersonSelect
              people={adults}
              value={form.backupTrusteePersonId}
              onChange={(id) => set({ backupTrusteePersonId: id })}
              exclude={[form.grantorPersonId, form.successorTrusteePersonId]}
            />
          </label>
        </div>
        <p className="hint">
          You are the trustee while you're alive and well — the successor trustee steps in at your
          death <em>or</em> if you can't manage your affairs, without a court order.
        </p>

        <div className="radio-group" role="radiogroup" aria-label="Distribution on death">
          {hasSpouse && (
            <label className="radio">
              <input
                type="radio"
                name="distribution"
                checked={form.distributionStrategy === 'SpouseThenChildren'}
                onChange={() => set({ distributionStrategy: 'SpouseThenChildren' })}
              />
              Everything to my spouse — then split among my children
            </label>
          )}
          {hasChildren && (
            <label className="radio">
              <input
                type="radio"
                name="distribution"
                checked={form.distributionStrategy === 'ChildrenEqually'}
                onChange={() => set({ distributionStrategy: 'ChildrenEqually' })}
              />
              Split equally among my children
            </label>
          )}
        </div>

        <div className="wizard-nav">
          <span />
          <button onClick={finish} disabled={saving || !form.successorTrusteePersonId}>
            {saving ? 'Working…' : render ? 'Save changes & refresh document' : 'Finish & preview document'}
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      {render && (
        <section className="card no-print" aria-label="Funding checklist">
          <h2>Fund your trust</h2>
          <p>
            The trust only controls what it owns. Retitle each asset into the trust, then check it
            off. (Retirement accounts stay out — they pass by beneficiary designation.)
          </p>
          {fundable.length === 0 ? (
            <p className="empty">
              No assets in your inventory yet. <Link to="/assets">Add them first →</Link>
            </p>
          ) : (
            <ul className="checklist">
              {fundable.map((asset) => (
                <li key={asset.id} className={asset.heldInTrust ? 'done' : 'todo'}>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={asset.heldInTrust}
                      onChange={() => toggleFunding(asset)}
                    />
                    {asset.name}
                    <span className="hint">({ASSET_CATEGORY_LABELS[asset.category]})</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {render && !executed && (
        <section className="card no-print">
          <h2>Already signed it? Make it count</h2>
          <form onSubmit={recordSigning} className="inline-form" aria-label="Record your signing">
            <label>
              Date signed
              <input
                type="date"
                value={signDate}
                onChange={(e) => setSignDate(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={saving}>
              I signed it — record it
            </button>
          </form>
        </section>
      )}

      {render && !executed && <ExecutionInstructions doc={render} />}
      {render && <LegalDocumentView doc={render} />}
    </div>
  )
}
