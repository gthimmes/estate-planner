import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HelpWidget } from './HelpWidget'

function shadow(): ShadowRoot {
  const host = document.querySelector('help-navigator-root')
  expect(host).not.toBeNull()
  return (host as HTMLElement).shadowRoot as ShadowRoot
}

afterEach(() => {
  cleanup()
})

describe('HelpWidget', () => {
  it('mounts the launcher in a shadow root and unmounts cleanly', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <HelpWidget />
      </MemoryRouter>,
    )
    expect(shadow().querySelector('.hn-launcher')).not.toBeNull()
    unmount()
    expect(document.querySelector('help-navigator-root')).toBeNull()
  })

  it('suggests dashboard articles on / and will articles on /will', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <HelpWidget />
      </MemoryRouter>,
    )
    ;(shadow().querySelector('.hn-launcher') as HTMLButtonElement).click()
    expect(shadow().querySelector('.hn-body')!.textContent).toContain('The estate readiness score')
    unmount()

    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={['/will']}>
        <HelpWidget />
      </MemoryRouter>,
    )
    ;(shadow().querySelector('.hn-launcher') as HTMLButtonElement).click()
    expect(shadow().querySelector('.hn-body')!.textContent).toContain('The guided will interview')
    unmount2()
  })
})
