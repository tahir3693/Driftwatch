import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadSpaceWeather, savedSampleWeather, getSpaceWeather, setSpaceWeather, LIVE_TIMEOUT_MS } from './spaceWeather.js'

const NOW = Date.UTC(2025, 5, 30, 12)
const KEY = 'TEST-KEY-123'
const liveEvents = [
  { sepID: 'a', eventTime: '2025-06-10T01:00Z', sentNotifications: [{ messageID: 'x' }] },
  { sepID: 'b', eventTime: '2025-06-20T05:30Z', sentNotifications: null },
]
const okResponse = (body) => ({ ok: true, status: 200, json: async () => body })
const run = (fetchImpl, over = {}) => loadSpaceWeather({ apiKey: KEY, online: true, now: NOW, fetchImpl, ...over })
const expectSample = (sw, liveError) => {
  expect(sw.mode).toBe('sample')
  expect(sw.line).toMatch(/^Space weather: NASA DONKI \(saved sample, downloaded \d{4}-\d{2}-\d{2}\)$/)
  expect(sw.liveError).toBe(liveError)
  expect(sw.count).toBe(27)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadSpaceWeather: live', () => {
  it('uses the live answer: mode live, latest event by time, with a null sentNotifications', async () => {
    const fetchImpl = vi.fn(async () => okResponse(liveEvents))
    const sw = await run(fetchImpl)
    expect(sw.mode).toBe('live')
    expect(sw.line).toBe('Space weather: NASA DONKI (live)')
    expect(sw.latest).toEqual({ sepID: 'b', eventTime: '2025-06-20T05:30Z', notifications: 0 })
    expect(sw.count).toBe(2)
    expect(sw.liveError).toBeUndefined()
  })

  it('asks DONKI once for the last 30 days, with the key only in the request and a timeout signal', async () => {
    const fetchImpl = vi.fn(async () => okResponse([]))
    const sw = await run(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(`https://api.nasa.gov/DONKI/SEP?startDate=2025-05-31&endDate=2025-06-30&api_key=${KEY}`)
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.stringify(sw)).not.toContain(KEY)
    expect(JSON.stringify(sw)).not.toMatch(/api_key/i)
    expect(sw.url).toBe('https://api.nasa.gov/DONKI/SEP')
  })
})

describe('loadSpaceWeather: falls back to the saved sample', () => {
  it('on an HTTP error', async () => {
    expectSample(await run(vi.fn(async () => ({ ok: false, status: 503, json: async () => [] }))), 'http')
  })

  it('on a rejected request (network failure)', async () => {
    expectSample(await run(vi.fn(async () => { throw new TypeError('Failed to fetch') })), 'network')
  })

  it('when the browser is offline, without making a request', async () => {
    const fetchImpl = vi.fn()
    expectSample(await run(fetchImpl, { online: false }), 'offline')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('on malformed JSON', async () => {
    expectSample(await run(vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token') } }))), 'invalid')
  })

  it('on JSON that is not an event list', async () => {
    for (const body of [{ message: 'error' }, 'text', null, 42]) {
      expectSample(await run(vi.fn(async () => okResponse(body))), 'invalid')
    }
  })

  it('after 5 seconds, when the request never answers', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(() => new Promise(() => {}))
    const pending = run(fetchImpl)
    await vi.advanceTimersByTimeAsync(LIVE_TIMEOUT_MS - 1)
    let settled = false
    pending.then(() => { settled = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expectSample(await pending, 'timeout')
    expect(LIVE_TIMEOUT_MS).toBe(5000)
  })

  it('never returns the key, even on failure', async () => {
    const sw = await run(vi.fn(async () => { throw new Error(`failed for ${KEY}`) }))
    expect(JSON.stringify(sw)).not.toContain(KEY)
  })
})

describe('loadSpaceWeather: no key', () => {
  it('uses the saved sample and makes no request, for a missing, empty or blank key', async () => {
    const fetchImpl = vi.fn()
    for (const apiKey of [undefined, '', '   ', null]) {
      expectSample(await loadSpaceWeather({ apiKey, online: true, now: NOW, fetchImpl }))
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('saved sample and the current value', () => {
  it('the saved sample has the plain address and 27 events from May to June 2024', () => {
    const sw = savedSampleWeather()
    expect(sw.url).toBe('https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30')
    expect(sw.latest.eventTime).toBe('2024-06-12T04:03Z')
  })

  it('getSpaceWeather starts as the sample and can be replaced', () => {
    expect(getSpaceWeather().mode).toBe('sample')
    const live = { mode: 'live' }
    setSpaceWeather(live)
    expect(getSpaceWeather()).toBe(live)
    setSpaceWeather(savedSampleWeather())
  })
})
