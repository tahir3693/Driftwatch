// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReactionCheck from './ReactionCheck.jsx'

let clock = 0
beforeEach(() => {
  clock = 1000
  vi.useFakeTimers()
  // Lets Testing Library detect the fake timers (it only looks for a global named jest).
  globalThis.jest = { advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms) }
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  vi.spyOn(Math, 'random').mockReturnValue(0.5) // wait of 4000 ms
})
afterEach(() => {
  cleanup()
  delete globalThis.jest
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const advance = (ms) => act(() => vi.advanceTimersByTime(ms))
const main = () => screen.getAllByRole('button')[0]
const status = () => screen.getByRole('status')
// Waits for a prompt, then taps 250 ms later.
const tapOnce = () => {
  advance(4000)
  expect(status().textContent).toContain('Tap now')
  clock += 250
  fireEvent.click(main())
}

describe('ReactionCheck', () => {
  it('shows the prompt between 2 and 6 seconds after start, in a polite live region', () => {
    Math.random.mockReturnValue(0)
    render(<ReactionCheck onResult={() => {}} />)
    fireEvent.click(main())
    expect(status().getAttribute('aria-live')).toBe('polite')
    advance(1999)
    expect(status().textContent).not.toContain('Tap now')
    advance(1)
    expect(status().textContent).toContain('Tap now')
  })

  it('keeps the wait below 6 seconds for the largest random value', () => {
    Math.random.mockReturnValue(0.9999999999999999)
    render(<ReactionCheck onResult={() => {}} />)
    fireEvent.click(main())
    advance(5999)
    expect(status().textContent).toContain('Tap now')
  })

  it('discards an early tap with a message and starts a new wait', () => {
    render(<ReactionCheck onResult={() => {}} />)
    fireEvent.click(main())
    advance(1000)
    fireEvent.click(main())
    expect(status().textContent).toContain('Too early. Wait for the prompt.')
    advance(3999)
    expect(status().textContent).not.toContain('Tap now')
    advance(1)
    expect(status().textContent).toContain('Tap now')
  })

  it('ends after 60 seconds with the rounded median', () => {
    const onResult = vi.fn()
    render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(main())
    for (let i = 0; i < 5; i++) tapOnce()
    expect(onResult).toHaveBeenCalledTimes(1) // only the reset at start
    advance(60 * 1000 - 5 * 4000)
    if (status().textContent.includes('Tap now')) {
      clock += 250
      fireEvent.click(main())
    }
    expect(status().textContent).toContain('Median reaction time: 250 ms')
    expect(onResult).toHaveBeenLastCalledWith(250)
  })

  it('ends at 2 minutes with no tap and no median', () => {
    const onResult = vi.fn()
    Math.random.mockReturnValue(0)
    render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(main())
    advance(2000) // prompt shown, never tapped
    advance(60 * 1000) // soft stop reached while the prompt waits for a tap
    expect(status().textContent).toContain('Tap now')
    advance(60 * 1000 - 2000)
    expect(status().textContent).toContain('Not enough taps. Please run the reaction check again.')
    expect(onResult).toHaveBeenLastCalledWith(null)
    expect(main().textContent).toBe('Run reaction check again')
  })

  it('gives the message and no median for fewer than 5 taps', () => {
    const onResult = vi.fn()
    render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(main())
    for (let i = 0; i < 3; i++) tapOnce()
    advance(60 * 1000)
    if (status().textContent.includes('Tap now')) fireEvent.click(main())
    expect(status().textContent).toContain('Not enough taps. Please run the reaction check again.')
    expect(onResult).toHaveBeenLastCalledWith(null)
  })

  it('records taps made with the Space key and the Enter key on the focused button', async () => {
    const onResult = vi.fn()
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
    render(<ReactionCheck onResult={onResult} />)
    main().focus()
    await user.keyboard('{Enter}') // start
    expect(main().textContent).toBe('Tap here')
    expect(document.activeElement).toBe(main())
    for (let i = 0; i < 5; i++) {
      advance(4000)
      expect(status().textContent).toContain('Tap now')
      clock += 300
      await user.keyboard(i % 2 === 0 ? ' ' : '{Enter}')
    }
    advance(60 * 1000)
    if (status().textContent.includes('Tap now')) {
      clock += 300
      await user.keyboard(' ')
    }
    expect(onResult).toHaveBeenLastCalledWith(300)
  })

  it('skips with no result and stops its timers', () => {
    const onResult = vi.fn()
    render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(main())
    fireEvent.click(screen.getByRole('button', { name: 'Skip reaction check' }))
    expect(onResult).toHaveBeenLastCalledWith(null)
    expect(status().textContent).toContain('Reaction check skipped')
    const calls = onResult.mock.calls.length
    advance(130 * 1000)
    expect(onResult.mock.calls.length).toBe(calls)
    expect(status().textContent).not.toContain('Tap now')
  })

  it('offers skip before the check starts and has 44 px controls', () => {
    const onResult = vi.fn()
    render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip reaction check' }))
    expect(onResult).toHaveBeenLastCalledWith(null)
    for (const b of screen.getAllByRole('button')) expect(b.className).toMatch(/min-h-11/)
  })

  it('clears its timers on unmount', () => {
    const onResult = vi.fn()
    const { unmount } = render(<ReactionCheck onResult={onResult} />)
    fireEvent.click(main())
    const calls = onResult.mock.calls.length
    unmount()
    advance(130 * 1000)
    expect(onResult.mock.calls.length).toBe(calls)
  })
})