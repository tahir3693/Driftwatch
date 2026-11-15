import { describe, it, expect } from 'vitest'
import sample from '../../data/nasa/donki-sep-sample.json'
import {
  DONKI_SEP_ENDPOINT,
  plainDonkiUrl,
  liveRequestUrl,
  parseEvents,
  latestEvent,
  buildSpaceWeather,
  whyContext,
} from './donki.js'

describe('plainDonkiUrl', () => {
  it('removes the api_key parameter and keeps the rest', () => {
    expect(plainDonkiUrl('https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30&api_key=SECRET')).toBe(
      'https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30',
    )
    expect(plainDonkiUrl('https://api.nasa.gov/DONKI/SEP?api_key=SECRET&startDate=2024-05-01')).toBe(
      'https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01',
    )
    expect(plainDonkiUrl('https://api.nasa.gov/DONKI/SEP?api_key=SECRET')).toBe('https://api.nasa.gov/DONKI/SEP')
  })

  it('removes the line break that an old saved file had inside the address', () => {
    expect(plainDonkiUrl('https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-\n30&api_key=REDACTED')).toBe(
      'https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30',
    )
  })

  it('falls back to the plain endpoint for a missing or broken value', () => {
    for (const v of [undefined, null, '', '   ', 5]) expect(plainDonkiUrl(v)).toBe(DONKI_SEP_ENDPOINT)
  })

  it('the saved sample file has no api_key anywhere', () => {
    expect(JSON.stringify(sample)).not.toMatch(/api_key/i)
    expect(sample.url).toBe(plainDonkiUrl(sample.url))
  })
})

describe('liveRequestUrl', () => {
  it('asks for the last 30 days and carries the key only here', () => {
    const now = Date.UTC(2025, 5, 30, 12)
    expect(liveRequestUrl(now, 'K E Y')).toBe(
      'https://api.nasa.gov/DONKI/SEP?startDate=2025-05-31&endDate=2025-06-30&api_key=K%20E%20Y',
    )
  })
})

describe('events', () => {
  it('parses a list or a saved file, and rejects anything else', () => {
    expect(parseEvents([{ eventTime: '2024-05-09T13:59Z' }])).toHaveLength(1)
    expect(parseEvents({ events: [{ eventTime: '2024-05-09T13:59Z' }] })).toHaveLength(1)
    for (const bad of [null, undefined, 'x', 5, {}, { events: 'x' }]) expect(() => parseEvents(bad)).toThrow()
  })

  it('drops entries with no usable eventTime', () => {
    expect(parseEvents([null, {}, { eventTime: 'nope' }, { eventTime: '2024-05-09T13:59Z' }, 7])).toHaveLength(1)
  })

  it('finds the latest event by time, whatever the order', () => {
    const a = { sepID: 'a', eventTime: '2024-05-09T13:59Z' }
    const b = { sepID: 'b', eventTime: '2024-06-12T04:03Z' }
    expect(latestEvent([b, a]).sepID).toBe('b')
    expect(latestEvent([a, b]).sepID).toBe('b')
    expect(latestEvent([])).toBeNull()
    expect(latestEvent(null)).toBeNull()
  })
})

describe('buildSpaceWeather with the saved sample', () => {
  const sw = buildSpaceWeather({ mode: 'sample', events: parseEvents(sample), downloaded: sample.downloaded, url: sample.url })

  it('has the saved-sample line with the download date', () => {
    expect(sw.line).toBe(`Space weather: NASA DONKI (saved sample, downloaded ${sample.downloaded.slice(0, 10)})`)
    expect(sw.mode).toBe('sample')
  })

  it('finds the latest event, 2024-06-12 04:03 UTC, which has no notification (null)', () => {
    expect(sw.latest).toMatchObject({ eventTime: '2024-06-12T04:03Z', notifications: 0 })
    expect(sw.latestText).toBe('Latest DONKI event: 2024-06-12 04:03 UTC.')
    expect(sw.count).toBe(27)
  })

  it('says the events are a real saved sample and the scenario values are simulated', () => {
    expect(sw.note).toMatch(/real NASA sample saved for May to June 2024/)
    expect(sw.note).toMatch(/scenario values in Driftwatch are simulated/)
    expect(sw.note).toMatch(/no flux or dose/)
  })

  it('holds no api_key, and the address is the plain one', () => {
    expect(JSON.stringify(sw)).not.toMatch(/api_key/i)
    expect(sw.url).toBe('https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-06-30')
  })
})

describe('buildSpaceWeather live', () => {
  it('has the live line and says the events are live data', () => {
    const sw = buildSpaceWeather({ mode: 'live', events: [{ eventTime: '2025-06-01T01:00Z', sentNotifications: [{}, {}] }] })
    expect(sw.line).toBe('Space weather: NASA DONKI (live)')
    expect(sw.note).toMatch(/live NASA data/)
    expect(sw.note).toMatch(/scenario values in Driftwatch are simulated/)
    expect(sw.latest.notifications).toBe(2)
  })

  it('works with no events', () => {
    const sw = buildSpaceWeather({ mode: 'live', events: [] })
    expect(sw.latest).toBeNull()
    expect(sw.latestText).toMatch(/no solar energetic particle events/)
    expect(whyContext(sw)).toMatch(/no solar energetic particle events are listed/)
  })
})

describe('whyContext', () => {
  const base = (notifications) => buildSpaceWeather({ mode: 'sample', events: [{ eventTime: '2024-06-12T04:03Z', sentNotifications: notifications }], downloaded: '2026-11-15T07:55:01Z' })

  it('names the latest event time, notifications and that DONKI gives no flux or dose', () => {
    const text = whyContext(base([{}]))
    expect(text).toMatch(/2024-06-12 04:03 UTC/)
    expect(text).toMatch(/NASA sent 1 notification for it/)
    expect(text).toMatch(/gives no flux or dose/)
    expect(text).toMatch(/context only and does not change the score/)
  })

  it('handles sentNotifications null, an empty list and several', () => {
    expect(whyContext(base(null))).toMatch(/No NASA notification is listed for it/)
    expect(whyContext(base([]))).toMatch(/No NASA notification is listed for it/)
    expect(whyContext(base([{}, {}]))).toMatch(/NASA sent 2 notifications for it/)
  })

  it('never states a size and never reads as a health claim', () => {
    const text = whyContext(base(null))
    expect(text).not.toMatch(/\b(large|major|strong|severe|big|small|pfu|mSv|S[1-5])\b/i)
    expect(text).not.toMatch(/\b(symptoms?|risk|concern|pattern|loss)\b/i)
  })

  it('is empty without space weather', () => {
    for (const v of [undefined, null, 'x']) expect(whyContext(v)).toBe('')
  })
})
