// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BmdTrackerLink, { BMD_TRACKER_URL } from './BmdTrackerLink.jsx'

afterEach(cleanup)

describe('BmdTrackerLink', () => {
  it('points to the bundled tracker page', () => {
    render(<BmdTrackerLink />)
    const link = screen.getByRole('link', { name: 'Open BMD and strength tracker' })
    expect(link.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}bmd-strength/index.html`)
    expect(BMD_TRACKER_URL.endsWith('bmd-strength/index.html')).toBe(true)
  })

  it('is at least 44 px tall by class and reachable with the keyboard', async () => {
    render(<BmdTrackerLink />)
    const link = screen.getByRole('link')
    expect(link.className).toContain('min-h-11')
    await userEvent.tab()
    expect(document.activeElement).toBe(link)
  })
  it('is a button, not a link, when it opens the in-app screen', async () => {
    const onOpen = vi.fn()
    render(<BmdTrackerLink onOpen={onOpen} />)
    expect(screen.queryByRole('link')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Open BMD and strength tracker' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
