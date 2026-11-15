// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen , cleanup } from '@testing-library/react'
import SimulatedBanner from './SimulatedBanner.jsx'

afterEach(cleanup)

describe('SimulatedBanner', () => {
  it('shows the exact disclaimer and has no button', () => {
    render(<SimulatedBanner />)
    expect(screen.getByText('Simulated data. Decision support, not a medical device.')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
