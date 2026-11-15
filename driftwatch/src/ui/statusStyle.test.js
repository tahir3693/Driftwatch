import { describe, it, expect } from 'vitest'
import { STATUS_STYLE, SURFACE, statusLabel, styleFor } from './statusStyle.js'

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('statusStyle', () => {
  it('has distinct colours and icon shapes', () => {
    const all = Object.values(STATUS_STYLE)
    expect(new Set(all.map((s) => s.color)).size).toBe(4)
    expect(new Set(all.map((s) => s.icon)).size).toBe(4)
    expect(all.map((s) => s.icon)).toEqual(['circle', 'triangle', 'square', 'dash'])
  })

  it('maps labels, with "No data" for null, undefined and unknown values', () => {
    expect(statusLabel('normal')).toBe('Normal')
    expect(statusLabel('watch')).toBe('Watch')
    expect(statusLabel('act')).toBe('Act')
    expect(statusLabel(null)).toBe('No data')
    expect(statusLabel(undefined)).toBe('No data')
    expect(statusLabel('other')).toBe('No data')
    expect(styleFor(null)).toBe(STATUS_STYLE.nodata)
  })

  it('has a contrast ratio of at least 4.5 against the surface', () => {
    for (const s of Object.values(STATUS_STYLE)) expect(contrast(s.color, SURFACE.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(SURFACE.text, SURFACE.background)).toBeGreaterThanOrEqual(4.5)
  })
})
