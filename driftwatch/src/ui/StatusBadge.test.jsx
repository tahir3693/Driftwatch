// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import StatusBadge from './StatusBadge.jsx'

afterEach(cleanup)

describe('StatusBadge', () => {
  it('shows the label and a distinct icon for each status', () => {
    const icons = []
    for (const [status, label, icon] of [
      ['normal', 'Normal', 'circle'],
      ['watch', 'Watch', 'triangle'],
      ['act', 'Act', 'square'],
      [null, 'No data', 'dash'],
    ]) {
      const { container } = render(<StatusBadge status={status} />)
      expect(screen.getByText(label)).toBeTruthy()
      icons.push(container.querySelector('svg').getAttribute('data-icon'))
      expect(icons.at(-1)).toBe(icon)
      cleanup()
    }
    expect(new Set(icons).size).toBe(4)
  })
})
