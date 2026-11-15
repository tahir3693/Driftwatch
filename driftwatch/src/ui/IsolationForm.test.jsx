// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IsolationForm from './IsolationForm.jsx'

afterEach(cleanup)

const EMPTY = { sleep: '', mood: '', social: '', reaction: '' }
function Harness({ onSubmit = () => {}, errors, initial = EMPTY }) {
  const [value, setValue] = useState(initial)
  return <IsolationForm value={value} onChange={setValue} onSubmit={() => onSubmit(value)} errors={errors} />
}

describe('IsolationForm', () => {
  it('labels sleep and social contact', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Sleep (h)')).toBeTruthy()
    expect(screen.getByLabelText('Social contact (min)')).toBeTruthy()
  })

  it('shows mood as 11 radios from 0 to 10 in a fieldset with the legend and the end labels', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Mood and stress' })
    expect(group.tagName).toBe('FIELDSET')
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.labels[0].textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(screen.getByText('0 Calm and happy')).toBeTruthy()
    expect(screen.getByText('10 Very stressed')).toBeTruthy()
  })

  it('allows a submit with no reaction result', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Sleep (h)'), '7')
    await userEvent.click(screen.getByLabelText('4'))
    await userEvent.type(screen.getByLabelText('Social contact (min)'), '30')
    await userEvent.click(screen.getByRole('button', { name: 'Save Isolation' }))
    expect(onSubmit).toHaveBeenCalledWith({ sleep: '7', mood: '4', social: '30', reaction: '' })
  })

  it('clears the reaction value when the reaction check is skipped', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} initial={{ ...EMPTY, reaction: 310 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip reaction check' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Isolation' }))
    expect(onSubmit.mock.calls[0][0].reaction).toBe('')
  })

  it('wires the mood error to the radios, and focuses the first invalid field', () => {
    render(<Harness errors={[{ field: 'sleep', message: 'Enter a value for Sleep.' }, { field: 'mood', message: 'Enter a value for Mood and stress.' }]} />)
    expect(document.activeElement).toBe(screen.getByLabelText('Sleep (h)'))
    const radio = screen.getByLabelText('3')
    expect(radio.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(radio.getAttribute('aria-describedby')).textContent).toContain('Enter a value for Mood and stress.')
  })

  it('focuses the first mood radio when mood is the first error', () => {
    render(<Harness errors={[{ field: 'mood', message: 'Enter a value for Mood and stress.' }]} />)
    expect(document.activeElement).toBe(screen.getByLabelText('0'))
  })
})