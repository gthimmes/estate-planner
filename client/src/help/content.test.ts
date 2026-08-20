import { describe, expect, it } from 'vitest'
import { ContentStore, createSearchIndex, renderMarkdown } from 'help-navigator'
import { helpContent } from './content'
import { allMappedArticleIds, helpArticlesFor } from './context'

describe('help content integrity', () => {
  const articleIds = new Set(helpContent.articles.map((a) => a.id))
  const categoryIds = new Set((helpContent.categories ?? []).map((c) => c.id))

  it('has unique article and category ids', () => {
    expect(articleIds.size).toBe(helpContent.articles.length)
    expect(categoryIds.size).toBe(helpContent.categories?.length)
  })

  it('every article belongs to a declared category', () => {
    for (const a of helpContent.articles) {
      expect(categoryIds.has(a.category ?? ''), `"${a.id}" has bad category "${a.category}"`).toBe(true)
    }
  })

  it('every declared category has at least one article', () => {
    for (const c of helpContent.categories ?? []) {
      expect(
        helpContent.articles.some((a) => a.category === c.id),
        `category "${c.id}" is empty`,
      ).toBe(true)
    }
  })

  it('every related id resolves and never self-references', () => {
    for (const a of helpContent.articles) {
      for (const rel of a.related ?? []) {
        expect(articleIds.has(rel), `"${a.id}" relates to unknown "${rel}"`).toBe(true)
        expect(rel).not.toBe(a.id)
      }
    }
  })

  it('bodies are substantive and render to HTML', () => {
    for (const a of helpContent.articles) {
      expect(a.body.trim().length, `"${a.id}" body too short`).toBeGreaterThan(100)
      expect(renderMarkdown(a.body).length).toBeGreaterThan(0)
    }
  })

  it('has featured articles for the help home view', () => {
    expect(helpContent.articles.filter((a) => a.featured).length).toBeGreaterThanOrEqual(4)
  })

  it('loads into a ContentStore without errors', () => {
    const store = new ContentStore(helpContent)
    expect(store.articles.length).toBe(helpContent.articles.length)
  })
})

describe('route context map', () => {
  const articleIds = new Set(helpContent.articles.map((a) => a.id))

  it('every mapped article id exists in the content', () => {
    for (const id of allMappedArticleIds()) {
      expect(articleIds.has(id), `route map references unknown article "${id}"`).toBe(true)
    }
  })

  it('covers every app route with curated context', () => {
    const routes = [
      '/',
      '/family',
      '/assets',
      '/will',
      '/will/document',
      '/poa',
      '/healthcare',
      '/living-will',
      '/trust',
      '/vault',
      '/executor-guide',
      '/sharing',
      '/settings',
      '/welcome',
    ]
    for (const route of routes) {
      expect(
        helpArticlesFor(route).length,
        `route ${route} has no help context`,
      ).toBeGreaterThan(0)
      if (route !== '/welcome') {
        expect(helpArticlesFor(route), `route ${route} fell through to the fallback`).not.toEqual([
          'welcome-tour',
        ])
      }
    }
  })

  it('unknown routes fall back to the tour', () => {
    expect(helpArticlesFor('/nope')).toEqual(['welcome-tour'])
  })
})

describe('help search over the real corpus', () => {
  const index = createSearchIndex(
    helpContent.articles.map((a) => ({ id: a.id, title: a.title, body: a.body, tags: a.tags })),
  )

  const expectations: Array<[string, string]> = [
    ['witnesses', 'signing-overview'],
    ['guardian', 'will-interview'],
    ['beneficiary designation', 'beneficiary-designations'],
    ['power of attorney', 'poa-explainer'],
    ['probate', 'living-trust'],
    ['executor', 'choosing-executor'],
    ['divorce', 'life-changes'],
    ['estate tax', 'tax-awareness'],
    ['vault', 'vault-help'],
    ['louisiana', 'legal-posture'],
  ]

  for (const [query, expectedId] of expectations) {
    it(`"${query}" surfaces ${expectedId} near the top`, () => {
      const top = index.search(query, 3).map((r) => r.id)
      expect(top, `query "${query}" returned ${JSON.stringify(top)}`).toContain(expectedId)
    })
  }
})
