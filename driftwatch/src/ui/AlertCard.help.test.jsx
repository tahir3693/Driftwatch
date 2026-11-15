// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import AlertCard from './AlertCard.jsx'

afterEach(cleanup)

const alert = (indicator) => ({
  domain: 'environment', indicator, value: 1, baseline: 1, status: 'watch', urgency: 40,
  why: 'Why.', action: 'Action.', escalate: false, source: 'design value',
})

describe('AlertCard Help button name', () => {
  it('names each Help button after its alert, so screen reader users can tell them apart', () => {
    render(
      <>
        <AlertCard alert={alert('cabin_co2_mmHg')} rule={{ label: 'Cabin CO2' }} />
        <AlertCard alert={alert('body_temperature')} rule={{ label: 'Body temperature' }} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Help for Cabin CO2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Help for Body temperature' })).toBeTruthy()
    for (const b of screen.getAllByRole('button')) expect(b.textContent.startsWith('Help')).toBe(true)
  })
})
