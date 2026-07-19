import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ExecutionInstructions, LegalDocumentView } from '../components/LegalDocumentView'
import { PersonSelect } from '../components/PersonSelect'
import { PersonTabs } from '../components/PersonTabs'
import { SignatureField } from '../components/SignaturePad'
import {
  isMinor,
  type EstateDocument,
  type EstateDocumentInput,
  type EstateDocumentType,
  type LifeSupportPreference,
  type Person,
  type WillDocument,
} from '../types'

const COPY: Record<
  EstateDocumentType,
  { title: string; agentLabel: string; intro: string }
> = {
  FinancialPoa: {
    title: 'Financial power of attorney',
    agentLabel: 'Financial agent',
    intro:
      'If an illness or accident leaves you unable to manage money, someone has to pay the mortgage, deal with the bank, and file your taxes. Without this document, your family may need a court order. With it, the person you choose can step in immediately.',
  },
  HealthcareDirective: {
    title: 'Advance healthcare directive',
    agentLabel: 'Healthcare agent',
    intro:
      "If you can't speak for yourself, this document speaks for you: who makes medical decisions, and what you'd want at the end of life. It spares your family from guessing at the hardest moment of their lives.",
  },
  LivingWill: {
    title: 'Living will',
    agentLabel: 'Healthcare agent',
    intro:
      'A pure declaration of your end-of-life wishes — no agent, no decisions delegated. It tells your doctors and family directly what you want when you can no longer say it. Pairs with (and should agree with) your healthcare directive.',
  },
}

export function EstateDocumentPage({
  householdId,
  type,
}: {
  householdId: string
  type: EstateDocumentType
}) {
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState<EstateDocumentInput | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [status, setStatus] = useState<EstateDocument['status']>('Draft')
  const [executedOn, setExecutedOn] = useState<string | null>(null)
  const [render, setRender] = useState<WillDocument | null>(null)
  const [signDate, setSignDate] = useState('')
  const [signNotes, setSignNotes] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const copy = COPY[type]

  const applyDoc = useCallback((doc: EstateDocument, selfId: string | null) => {
    setStatus(doc.status)
    setExecutedOn(doc.executedOn)
    setForm(
      (prev) =>
        prev ?? {
          principalPersonId: doc.principalPersonId ?? selfId,
          agentPersonId: doc.agentPersonId,
          backupAgentPersonId: doc.backupAgentPersonId,
          effectiveImmediately: doc.effectiveImmediately,
          lifeSupport: doc.lifeSupport,
          includeHipaa: doc.includeHipaa,
          organDonation: doc.organDonation,
        },
    )
  }, [])

  useEffect(() => {
    Promise.all([api.getEstateDocument(householdId, type, selectedPersonId), api.listPeople(householdId)])
      .then(([doc, ppl]) => {
        setPeople(ppl)
        applyDoc(doc, ppl.find((p) => p.role === 'Self')?.id ?? null)
        setSelectedPersonId(
          (prev) => prev ?? doc.principalPersonId ?? ppl.find((p) => p.role === 'Self')?.id ?? null,
        )
        if (doc.status !== 'Draft') {
          void api.getEstateDocumentRender(householdId, type, doc.principalPersonId).then(setRender)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId, type, applyDoc, selectedPersonId])

  function switchPerson(id: string) {
    if (id === selectedPersonId) return
    setForm(null)
    setRender(null)
    setSelectedPersonId(id)
  }

  const adults = useMemo(() => people.filter((p) => !isMinor(p)), [people])

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
          <h1>{copy.title}</h1>
        </header>
        <section className="card">
          <p>First, add the people in your life — you'll pick your agent from them.</p>
          <Link to="/family">Add your family first →</Link>
        </section>
      </div>
    )
  }

  const set = (patch: Partial<EstateDocumentInput>) => setForm({ ...form, ...patch })
  const executed = status === 'Executed'

  async function finish() {
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await api.saveEstateDocument(householdId, type, form)
      const doc = await api.completeEstateDocument(householdId, type, form.principalPersonId)
      setStatus(doc.status)
      setRender(await api.getEstateDocumentRender(householdId, type, form.principalPersonId))
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
      const doc = await api.markEstateDocumentExecuted(
        householdId,
        type,
        { executedOn: signDate, executionNotes: signNotes || null, signatureImage },
        form.principalPersonId,
      )
      setStatus(doc.status)
      setExecutedOn(doc.executedOn)
      setRender(await api.getEstateDocumentRender(householdId, type, form.principalPersonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record signing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="page-header no-print">
        <div>
          <h1>{copy.title}</h1>
          <p className="subtitle">{copy.intro}</p>
        </div>
        {render && (
          <div className="doc-actions">
            <button onClick={() => window.print()}>Print</button>
            <a
              className="button-link"
              href={`/api/households/${householdId}/documents/${type}/document/pdf${form.principalPersonId ? `?personId=${form.principalPersonId}` : ''}`}
              download
            >
              Download PDF
            </a>
          </div>
        )}
      </header>

      <PersonTabs
        people={adults}
        activeId={selectedPersonId}
        onSelect={switchPerson}
        label="Whose document"
      />

      {executed && (
        <aside className="banner success no-print" role="status">
          <strong>Signed on {executedOn}.</strong> Editing below revokes the signing record.
        </aside>
      )}

      <section className="card no-print" aria-label={`${copy.title} choices`}>
        <div className="inline-form">
          <label>
            This document is for
            <PersonSelect
              people={adults}
              value={form.principalPersonId}
              onChange={(id) => {
                set({ principalPersonId: id })
                if (id) switchPerson(id)
              }}
            />
          </label>
          {type !== 'LivingWill' && (
            <>
              <label>
                {copy.agentLabel}
                <PersonSelect
                  people={adults}
                  value={form.agentPersonId}
                  onChange={(id) => set({ agentPersonId: id })}
                  exclude={[form.principalPersonId]}
                />
              </label>
              <label>
                Backup agent (recommended)
                <PersonSelect
                  people={adults}
                  value={form.backupAgentPersonId}
                  onChange={(id) => set({ backupAgentPersonId: id })}
                  exclude={[form.principalPersonId, form.agentPersonId]}
                />
              </label>
            </>
          )}
        </div>

        {type === 'FinancialPoa' && (
          <div className="radio-group" role="radiogroup" aria-label="When does it take effect">
            <label className="radio">
              <input
                type="radio"
                name="effective"
                checked={form.effectiveImmediately}
                onChange={() => set({ effectiveImmediately: true })}
              />
              Effective immediately (standard — simplest for your agent to use)
            </label>
            <label className="radio">
              <input
                type="radio"
                name="effective"
                checked={!form.effectiveImmediately}
                onChange={() => set({ effectiveImmediately: false })}
              />
              Only if I become incapacitated ("springing" — requires a doctor's certification first)
            </label>
          </div>
        )}

        {(type === 'HealthcareDirective' || type === 'LivingWill') && (
          <>
            <div className="radio-group" role="radiogroup" aria-label="Life support preference">
              <p className="hint">If you're near the end of life and can't speak for yourself:</p>
              {(
                [
                  ['DoNotProlong', "Don't prolong my life with machines if there's no reasonable hope of recovery"],
                  ['ProlongLife', 'Prolong my life as long as possible, within accepted medical standards'],
                  type === 'HealthcareDirective'
                    ? ['AgentDecides', 'Let my agent decide based on what they believe I would want']
                    : ['AgentDecides', 'Let my loved ones and doctors be guided by what they believe I would want'],
                ] as [LifeSupportPreference, string][]
              ).map(([value, label]) => (
                <label key={value} className="radio">
                  <input
                    type="radio"
                    name="lifesupport"
                    checked={form.lifeSupport === value}
                    onChange={() => set({ lifeSupport: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
            {type === 'HealthcareDirective' && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.includeHipaa}
                  onChange={(e) => set({ includeHipaa: e.target.checked })}
                />
                Include a HIPAA authorization so my agent can see my medical records (recommended)
              </label>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.organDonation}
                onChange={(e) => set({ organDonation: e.target.checked })}
              />
              I want to be an organ donor
            </label>
          </>
        )}

        <div className="wizard-nav">
          <span />
          <button
            onClick={finish}
            disabled={saving || (type === 'LivingWill' ? !form.principalPersonId : !form.agentPersonId)}
          >
            {saving ? 'Working…' : render ? 'Save changes & refresh document' : 'Finish & preview document'}
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

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
            <label>
              Notes (optional)
              <input
                value={signNotes}
                onChange={(e) => setSignNotes(e.target.value)}
                placeholder="e.g. notarized at the bank; copies to agent"
              />
            </label>
            <div className="signature-block">
              <span className="field-caption">E-signature for your record (optional)</span>
              <SignatureField
                defaultName={
                  people.find((p) => p.id === form.principalPersonId)
                    ? `${people.find((p) => p.id === form.principalPersonId)!.firstName} ${people.find((p) => p.id === form.principalPersonId)!.lastName}`
                    : ''
                }
                value={signatureImage}
                onChange={setSignatureImage}
              />
            </div>
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
