import { useEffect, useState } from 'react'
import { api } from '../api'
import { LegalDocumentView } from '../components/LegalDocumentView'
import type { WillDocument } from '../types'

export function ExecutorGuide({ householdId }: { householdId: string }) {
  const [doc, setDoc] = useState<WillDocument | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getExecutorGuide(householdId)
      .then(setDoc)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!doc) return <p className="loading">Assembling the guide…</p>

  return (
    <div>
      <header className="page-header no-print">
        <div>
          <h1>Executor's guide</h1>
          <p className="subtitle">
            The one packet your executor will wish they had: who's who, where every document lives,
            how each asset passes, and what to do first. It updates itself as your plan changes —
            print a copy and keep it with your will.
          </p>
        </div>
        <div className="doc-actions">
          <button onClick={() => window.print()}>Print</button>
          <a className="button-link" href={`/api/households/${householdId}/executor-guide/pdf`} download>
            Download PDF
          </a>
        </div>
      </header>
      <LegalDocumentView doc={doc} />
    </div>
  )
}
