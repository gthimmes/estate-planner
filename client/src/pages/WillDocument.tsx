import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { ExecutionInstructions, LegalDocumentView } from '../components/LegalDocumentView'
import { SignatureField } from '../components/SignaturePad'
import type { WillDocument as WillDocumentData, WillPlan } from '../types'

function SigningForm({
  householdId,
  personId,
  signerName,
  onExecuted,
}: {
  householdId: string
  personId: string | null
  signerName: string
  onExecuted: (will: WillPlan) => void
}) {
  const [executedOn, setExecutedOn] = useState('')
  const [witness1Name, setWitness1] = useState('')
  const [witness2Name, setWitness2] = useState('')
  const [storageLocation, setStorage] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const will = await api.markWillExecuted(
        householdId,
        { executedOn, witness1Name, witness2Name, storageLocation, signatureImage },
        personId,
      )
      onExecuted(will)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record signing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="inline-form" aria-label="Record your signing">
      <label>
        Date signed
        <input
          type="date"
          value={executedOn}
          onChange={(e) => setExecutedOn(e.target.value)}
          required
        />
      </label>
      <label>
        Witness 1 (full name)
        <input value={witness1Name} onChange={(e) => setWitness1(e.target.value)} required />
      </label>
      <label>
        Witness 2 (full name)
        <input value={witness2Name} onChange={(e) => setWitness2(e.target.value)} required />
      </label>
      <label>
        Where is the signed original?
        <input
          value={storageLocation}
          onChange={(e) => setStorage(e.target.value)}
          placeholder="e.g. fireproof safe in the study"
          required
        />
      </label>
      <div className="signature-block">
        <span className="field-caption">E-signature for your record (optional)</span>
        <SignatureField
          defaultName={signerName}
          value={signatureImage}
          onChange={setSignatureImage}
        />
        <span className="hint">
          Adopted into your signing record and stamped on the PDF. The paper original with ink and
          witnesses is still what makes the will legally valid.
        </span>
      </div>
      <button type="submit" disabled={saving}>
        {saving ? 'Recording…' : 'I signed it — record it'}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  )
}

export function WillDocument({ householdId }: { householdId: string }) {
  const [searchParams] = useSearchParams()
  const personId = searchParams.get('personId')
  const [doc, setDoc] = useState<WillDocumentData | null>(null)
  const [will, setWill] = useState<WillPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    () =>
      Promise.all([api.getWillDocument(householdId, personId), api.getWill(householdId, personId)])
        .then(([d, w]) => {
          setDoc(d)
          setWill(w)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load')),
    [householdId, personId],
  )

  useEffect(() => {
    void load()
  }, [load])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!doc || !will) return <p className="loading">Preparing your document…</p>

  const executed = will.status === 'Executed'

  return (
    <div className="will-document-page">
      <header className="page-header no-print">
        <div>
          <h1>
            {executed
              ? 'Your will is signed'
              : doc.isDraft
                ? 'Your will (draft)'
                : 'Your will is drafted'}
          </h1>
          <p className="subtitle">
            {executed
              ? 'Recorded and reflected in your readiness score. Nice work — most people never get this far.'
              : doc.isDraft
                ? 'This is a draft preview — finish the interview to complete it.'
                : 'One thing left: it only becomes real when you sign it with witnesses.'}
          </p>
        </div>
        <div className="doc-actions">
          <button onClick={() => window.print()}>Print</button>
          <a
            className="button-link"
            href={`/api/households/${householdId}/will/document/pdf${personId ? `?personId=${personId}` : ''}`}
            download
          >
            Download PDF
          </a>
          <Link to="/will">Edit the will</Link>
        </div>
      </header>

      {executed && (
        <aside className="banner success no-print" role="status">
          <strong>Signed on {will.executedOn}</strong> — witnessed by {will.witness1Name} and{' '}
          {will.witness2Name}. Original stored: {will.storageLocation}.
          <p className="hint">
            Editing the will revokes this record — a changed will must be signed again.
          </p>
        </aside>
      )}

      {!executed && !doc.isDraft && (
        <section className="card no-print">
          <h2>Already signed it? Make it count</h2>
          <p>
            Once you've signed with your witnesses, record it here. Your readiness score reflects a{' '}
            <em>signed</em> will — an unsigned one has no legal effect.
          </p>
          <SigningForm
            householdId={householdId}
            personId={personId}
            signerName={doc.testatorName}
            onExecuted={(w) => {
              setWill(w)
              void load()
            }}
          />
        </section>
      )}

      {doc.beneficiaryConflictNotes.length > 0 && (
        <aside className="banner warning no-print" role="note">
          <strong>Outside this will:</strong>
          <ul>
            {doc.beneficiaryConflictNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </aside>
      )}

      {!executed && <ExecutionInstructions doc={doc} />}

      <LegalDocumentView doc={doc} />
    </div>
  )
}
