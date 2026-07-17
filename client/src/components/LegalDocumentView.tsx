import type { WillDocument } from '../types'

export function LegalDocumentView({ doc }: { doc: WillDocument }) {
  return (
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
  )
}

export function ExecutionInstructions({ doc }: { doc: WillDocument }) {
  return (
    <section className="card no-print execution">
      <h2>
        How to make it legal in {doc.execution.stateCode}
        {doc.execution.witnessCount > 0 && ` (${doc.execution.witnessCount} witnesses)`}
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
  )
}
