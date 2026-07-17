import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { WillDocument as WillDocumentData } from '../types'

export function WillDocument({ householdId }: { householdId: string }) {
  const [doc, setDoc] = useState<WillDocumentData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getWillDocument(householdId)
      .then(setDoc)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!doc) return <p className="loading">Preparing your document…</p>

  return (
    <div className="will-document-page">
      <header className="page-header no-print">
        <div>
          <h1>Your will is drafted</h1>
          <p className="subtitle">
            {doc.isDraft
              ? 'This is a draft preview — finish the interview to complete it.'
              : 'One thing left: it only becomes real when you sign it with witnesses.'}
          </p>
        </div>
        <div className="doc-actions">
          <button onClick={() => window.print()}>Print</button>
          <Link to="/will">Edit the will</Link>
        </div>
      </header>

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

      <section className="card no-print execution">
        <h2>
          How to make it legal in {doc.execution.stateCode} ({doc.execution.witnessCount} witnesses)
        </h2>
        <ol>
          {doc.execution.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <ul className="warnings">
          {doc.execution.warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </section>

      <article className="card legal-document">
        {doc.isDraft && <p className="watermark">DRAFT</p>}
        <h2 className="doc-title">{doc.title}</h2>
        {doc.articles.map((article) => (
          <section key={article.heading}>
            <h3>{article.heading}</h3>
            {article.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </section>
        ))}
        <footer className="doc-disclosure">{doc.disclosure}</footer>
      </article>
    </div>
  )
}
