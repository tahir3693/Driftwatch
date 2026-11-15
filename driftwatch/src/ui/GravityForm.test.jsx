// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GravityForm from './GravityForm.jsx'

afterEach(cleanup)

function Harness({ onSubmit = () => {}, errors }) {
  const [value, setValue] = useState({ exercise: '' })
  return <GravityForm value={value} onChange={setValue} onSubmit={() => onSubmit(value)} errors={errors} />
}

describe('GravityForm', () => {
  it('has a labelled input and a submit button, and submits the value', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Exercise sessions in the last 7 days'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Save Gravity' }))
    expect(onSubmit).toHaveBeenCalledWith({ exercise: '5' })
  })
  it('wires the error and focuses the field', () => {
    render(<Harness errors={[{ field: 'exercise', message: 'Exercise sessions must be a whole number.' }]} />)
    const input = screen.getByLabelText('Exercise sessions in the last 7 days')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(input.getAttribute('aria-describedby').split(' ').pop()).textContent).toContain('must be a whole number.')
  })
})