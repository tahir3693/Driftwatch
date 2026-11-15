import { describe, it, expect } from 'vitest'
import { offlineStatus } from './offlineStatus.js'

describe('offlineStatus', () => {
  it('says Offline ready when the service worker has cached the app', () => {
    const s = offlineStatus({ supported: true, ready: true, online: false })
    expect(s.key).toBe('ready')
    expect(s.label).toBe('Offline ready')
    expect(s.detail).toMatch(/^Offline\./)
  })

  it('says Preparing offline use before the cache is complete', () => {
    const s = offlineStatus({ supported: true, ready: false, online: true })
    expect(s.key).toBe('preparing')
    expect(s.label).toBe('Preparing offline use')
    expect(s.detail).toMatch(/^Online\./)
  })

  it('says Offline not available without service worker support', () => {
    const s = offlineStatus({ supported: false, ready: false, online: true })
    expect(s.key).toBe('unsupported')
    expect(s.label).toBe('Offline not available')
  })

  it('never reports ready when unsupported', () => {
    expect(offlineStatus({ supported: false, ready: true, online: true }).key).toBe('unsupported')
  })
})
