// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RadiationForm from './RadiationForm.jsx'

afterEach(cleanup)

const NONE = { symptoms: { nausea: false, vomiting: false, fatigue: false, skin: false, fever: false, bruising: false } }
function Harness({ onSubmit = () => {} }) {
  const [value, setValue] = useState(NONE)
  return <RadiationForm value={value} onChange={setValue} onSubmit={() => onSubmit(value)} />
}

describe('RadiationForm', () => {
  it('shows six labelled checkboxes in one fieldset with a legend', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Symptoms today' })
    const labels = within(group).getAllByRole('checkbox').map((c) => c.labels[0].textContent)
    expect(labels).toEqual(['Nausea', 'Vomiting', 'Unusual fatigue', 'Skin redness or irritation', 'Fever or chills', 'Easy bruising or bleeding'])
    expect(screen.getByText(/possible symptoms/)).toBeTruthy()
  })

  it('accepts a submit with nothing ticked', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save Radiation' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(Object.values(onSubmit.mock.calls[0][0].symptoms).every((v) => v === false)).toBe(true)
  })

  it('records the ticked symptoms and unticks them again', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.click(screen.getByLabelText('Nausea'))
    await userEvent.click(screen.getByLabelText('Fever or chills'))
    await userEvent.click(screen.getByLabelText('Fever or chills'))
    await userEvent.click(screen.getByRole('button', { name: 'Save Radiation' }))
    const { symptoms } = onSubmit.mock.calls[0][0]
    expect(symptoms.nausea).toBe(true)
    expect(symptoms.fever).toBe(false)
  })
})