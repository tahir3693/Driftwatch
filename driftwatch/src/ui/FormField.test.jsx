// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormField from './FormField.jsx'
import YesNoField from './YesNoField.jsx'

afterEach(cleanup)

describe('FormField', () => {
  it('associates a visible label with the input, including the unit', () => {
    render(<FormField id="x-co2" label="Cabin CO2" unit="mmHg" value="" onChange={() => {}} />)
    const input = screen.getByLabelText('Cabin CO2 (mmHg)')
    expect(input.id).toBe('x-co2')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
  })
  it('wires the error with aria-invalid and aria-describedby, with text next to the field', () => {
    render(<FormField id="x-co2" label="Cabin CO2" error="Cabin CO2 must be a number." hint="A hint." value="abc" onChange={() => {}} />)
    const input = screen.getByLabelText('Cabin CO2')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const ids = input.getAttribute('aria-describedby').split(' ')
    expect(ids).toContain('x-co2-error')
    expect(ids).toContain('x-co2-hint')
    expect(document.getElementById('x-co2-error').textContent).toContain('Cabin CO2 must be a number.')
  })
  it('calls onChange with the typed text', async () => {
    const onChange = vi.fn()
    render(<FormField id="a" label="Thing" value="" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Thing'), '7')
    expect(onChange).toHaveBeenCalledWith('7')
  })
})

describe('YesNoField', () => {
  it('groups two radios in a fieldset with a legend and reports the answer', async () => {
    const onChange = vi.fn()
    render(<YesNoField id="e-h" legend="Headache today" value={null} onChange={onChange} />)
    const group = screen.getByRole('group', { name: 'Headache today' })
    expect(group.tagName).toBe('FIELDSET')
    expect(screen.getByLabelText('Yes').checked).toBe(false)
    await userEvent.click(screen.getByLabelText('No'))
    expect(onChange).toHaveBeenCalledWith(false)
    await userEvent.click(screen.getByLabelText('Yes'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('wires its error to both radios and gives the first radio the field id', () => {
    render(<YesNoField id="e-h" legend="Headache today" value={null} onChange={() => {}} error="Choose yes or no." />)
    for (const name of ['Yes', 'No']) {
      const r = screen.getByLabelText(name)
      expect(r.getAttribute('aria-invalid')).toBe('true')
      expect(r.getAttribute('aria-describedby')).toBe('e-h-error')
    }
    expect(screen.getByLabelText('Yes').id).toBe('e-h')
    expect(screen.getByText('Choose yes or no.')).toBeTruthy()
  })
})