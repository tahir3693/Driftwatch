// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NutritionForm from './NutritionForm.jsx'

afterEach(cleanup)

function Harness({ onSubmit = () => {}, errors }) {
  const [value, setValue] = useState({ intake: '' })
  return <NutritionForm value={value} onChange={setValue} onSubmit={() => onSubmit(value)} errors={errors} />
}

describe('NutritionForm', () => {
  it('has a labelled input and submits with Enter', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Share of the planned menu eaten today (%)'), '85{Enter}')
    expect(onSubmit).toHaveBeenCalledWith({ intake: '85' })
  })
  it('wires the error and focuses the field', () => {
    render(<Harness errors={[{ field: 'intake', message: 'Enter a value for Food intake.' }]} />)
    const input = screen.getByLabelText('Share of the planned menu eaten today (%)')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toContain('Enter a value for Food intake.')
  })
})