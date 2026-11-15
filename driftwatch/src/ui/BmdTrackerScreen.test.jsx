// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import BmdTrackerScreen from './BmdTrackerScreen.jsx'
import Dashboard from './Dashboard.jsx'
import { attachFrame } from './trackerFrame.js'
import { BMD_TRACKER_URL } from './BmdTrackerLink.jsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BmdTrackerScreen', () => {
  it('shows the simulated note, a Back to dashboard button and the tracker in a titled same-origin iframe', async () => {
    const onBack = vi.fn()
    render(<BmdTrackerScreen onBack={onBack} />)
    expect(screen.getAllByText('Simulated data. Decision support, not a medical device.')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'BMD and strength' })).toBeTruthy()
    const frame = screen.getByTitle('BMD and strength tracker')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe(BMD_TRACKER_URL)
    expect(frame.getAttribute('src')).not.toMatch(/^[a-z]+:\/\//i) // same origin: no host in the address
    expect(frame.className).toMatch(/\bw-full\b/)
    await userEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('has no link that opens a new tab', () => {
    const { container } = render(<BmdTrackerScreen onBack={() => {}} />)
    expect(container.querySelector('a[target]')).toBeNull()
  })
})

describe('Dashboard BMD and strength button', () => {
  const data = { alerts: [], readings: {}, rules: {}, baselineStats: {}, status: 'ready', hasReadings: true }

  it('has no separate BMD button on the dashboard: the tab row has it', () => {
    render(<Dashboard data={data} onShowBmd={() => {}} />)
    expect(screen.queryByRole('button', { name: 'BMD and strength' })).toBeNull()
  })

  it('opens the screen from the Bones and muscles detail too', async () => {
    const onShowBmd = vi.fn()
    render(<Dashboard data={data} onShowBmd={onShowBmd} />)
    await userEvent.click(screen.getByRole('button', { name: /Bones and muscles/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Open BMD and strength tracker' }))
    expect(onShowBmd).toHaveBeenCalledTimes(1)
  })
})

describe('attachFrame (iframe sizing)', () => {
  function makeFrame(height) {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    const box = { height }
    vi.spyOn(doc.documentElement, 'getBoundingClientRect').mockImplementation(() => ({ height: box.height, top: 0, bottom: box.height }))
    vi.spyOn(iframe, 'getBoundingClientRect').mockReturnValue({ top: -100, bottom: 1000, height: 1100 })
    return { iframe, doc, box }
  }

  it('marks the page as embedded and sets the iframe height to the content height', () => {
    const { iframe, doc } = makeFrame(1234.2)
    const stop = attachFrame(iframe)
    expect(doc.documentElement.classList.contains('dw-embedded')).toBe(true)
    expect(iframe.style.height).toBe('1235px')
    stop()
    iframe.remove()
  })

  it('follows the content when the resize observer fires', () => {
    let notify = () => {}
    const observed = []
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb) { notify = cb }
      observe(el) { observed.push(el) }
      disconnect() { observed.length = 0 }
    })
    vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 1 })
    window.requestAnimationFrame = (cb) => { cb(); return 1 }
    const { iframe, doc, box } = makeFrame(800)
    const stop = attachFrame(iframe)
    expect(iframe.style.height).toBe('800px')
    expect(observed).toContain(doc.documentElement)
    box.height = 1500
    notify()
    expect(iframe.style.height).toBe('1500px')
    stop()
    expect(observed).toEqual([])
    iframe.remove()
  })

  it('tells the page which part is visible, for its dialog and toast', () => {
    const { iframe, doc } = makeFrame(1100)
    window.innerHeight = 700
    const stop = attachFrame(iframe)
    // The frame starts 100 px above the window top: the visible part is 100 to 800.
    expect(doc.documentElement.style.getPropertyValue('--dw-view-top')).toBe('100px')
    expect(doc.documentElement.style.getPropertyValue('--dw-view-bottom')).toBe('800px')
    expect(doc.documentElement.style.getPropertyValue('--dw-view-height')).toBe('700px')
    stop()
    iframe.remove()
  })

  it('does nothing when the page cannot be read', () => {
    const iframe = { get contentDocument() { throw new Error('blocked') } }
    expect(() => attachFrame(iframe)()).not.toThrow()
  })
})

describe('tracker style.css (Driftwatch look)', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '..', '..', 'public', 'bmd-strength', 'style.css'), 'utf8')

  it('uses the app colours in its variables, with system fonts only and nothing remote', () => {
    const root = css.match(/:root\{[^}]*\}/)[0]
    expect(root).toContain('--bg:#0f172a')
    expect(root).toContain('--ink:#f1f5f9')
    expect(root).toContain('--green:#2dd4bf')
    expect(root).toContain('color-scheme:dark')
    expect(css).not.toMatch(/https?:|@import|@font-face|url\(/i)
    expect(css).toContain('system-ui')
  })

  it('hides the brand header and the overline text but not the controls', () => {
    expect(css).toMatch(/aside \.brand,aside>\.overline,\.heading \.overline\{display:none\}/)
    // Later rules undo the original phone-width hiding of the view labels and the export button.
    expect(css).toContain('nav button span,nav button.active span{display:inline;')
    expect(css).toContain('.sidebar-bottom{position:static;display:flex!important')
  })

  it('keeps a visible focus outline and status words next to the status colours', () => {
    expect(css).toMatch(/:focus-visible[^{]*\{outline:3px solid/)
    expect(css).toContain('Act below this line')
    expect(css).toContain('content:"Today"')
  })

  it('hides the page note and back link when embedded, and keeps them when opened alone', () => {
    expect(css).toMatch(/\.dw-embedded \.dw-disclaimer\{display:none\}/)
    expect(css).toMatch(/\.dw-disclaimer\{position:static/)
  })
})
