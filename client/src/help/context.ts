// Maps app routes to the help articles most relevant on that page —
// surfaced as "Suggested for this page" when the help panel opens.

const ROUTE_HELP: Array<{ pattern: RegExp; articles: string[] }> = [
  { pattern: /^\/$/, articles: ['readiness-score', 'welcome-tour', 'tax-awareness'] },
  { pattern: /^\/family/, articles: ['family-setup', 'spouse-documents'] },
  { pattern: /^\/assets/, articles: ['assets-inventory', 'beneficiary-designations'] },
  { pattern: /^\/will/, articles: ['will-interview', 'choosing-executor', 'signing-overview'] },
  { pattern: /^\/poa/, articles: ['poa-explainer', 'choosing-executor', 'signing-overview'] },
  { pattern: /^\/healthcare/, articles: ['healthcare-directive', 'choosing-executor', 'signing-overview'] },
  { pattern: /^\/living-will/, articles: ['healthcare-directive', 'esign-living-will'] },
  { pattern: /^\/trust/, articles: ['living-trust', 'assets-inventory', 'signing-overview'] },
  { pattern: /^\/vault/, articles: ['vault-help', 'signing-overview', 'executor-guide-help'] },
  { pattern: /^\/executor-guide/, articles: ['executor-guide-help', 'sharing-help', 'vault-help'] },
  { pattern: /^\/sharing/, articles: ['sharing-help', 'executor-guide-help'] },
  { pattern: /^\/settings/, articles: ['life-changes', 'plan-settings', 'beneficiary-designations'] },
  { pattern: /^\/welcome/, articles: ['welcome-tour', 'family-setup'] },
]

export function helpArticlesFor(pathname: string): string[] {
  return ROUTE_HELP.find((r) => r.pattern.test(pathname))?.articles ?? ['welcome-tour']
}

// Exported for tests: every article id referenced by the map.
export function allMappedArticleIds(): string[] {
  return [...new Set(ROUTE_HELP.flatMap((r) => r.articles))]
}
