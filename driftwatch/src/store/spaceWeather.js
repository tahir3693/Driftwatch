// NASA DONKI space weather context for the Radiation module.
//
// The deployed build has no API key and always uses the saved sample (data/nasa/donki-sep-sample.json,
// bundled into the app, so it works offline). A live request happens only when VITE_NASA_API_KEY is set
// and the browser is online. It has a 5 second limit and any failure falls back to the saved sample.
// The key goes only into the request address. It is never logged, stored, returned or shown.
import { useEffect, useState } from 'react'
import sample from '../../data/nasa/donki-sep-sample.json'
import { buildSpaceWeather, liveRequestUrl, parseEvents } from '../data/donki.js'

export const LIVE_TIMEOUT_MS = 5000

/** The saved sample as a space weather object (mode 'sample'). */
export function savedSampleWeather(liveError) {
  return buildSpaceWeather({
    mode: 'sample',
    events: parseEvents(sample),
    downloaded: sample.downloaded,
    url: sample.url,
    liveError,
  })
}

class LiveError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

async function requestLive(url, fetchImpl, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort()
      reject(new LiveError('timeout'))
    }, timeoutMs)
  })
  const work = (async () => {
    let res
    try {
      res = await fetchImpl(url, { signal: controller?.signal })
    } catch {
      throw new LiveError('network')
    }
    if (!res || !res.ok) throw new LiveError('http')
    let body
    try {
      body = await res.json()
    } catch {
      throw new LiveError('invalid')
    }
    try {
      return parseEvents(body)
    } catch {
      throw new LiveError('invalid')
    }
  })()
  work.catch(() => {}) // when the limit wins, a later failure of the request is not an unhandled rejection
  try {
    return await Promise.race([work, limit])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Space weather for the app. Never throws.
 * options: { apiKey, online, now, fetchImpl, timeoutMs }.
 * Without a key, or when offline, it returns the saved sample and makes no request.
 * With a key and a connection it asks DONKI (last 30 days) and returns mode 'live'; any failure
 * (timeout, network, HTTP error, malformed answer) returns the saved sample with `liveError` set to a short code.
 */
export async function loadSpaceWeather({
  apiKey,
  online = true,
  now = Date.now(),
  fetchImpl = globalThis.fetch,
  timeoutMs = LIVE_TIMEOUT_MS,
} = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (!key) return savedSampleWeather()
  if (!online) return savedSampleWeather('offline')
  if (typeof fetchImpl !== 'function') return savedSampleWeather('network')
  try {
    const events = await requestLive(liveRequestUrl(now, key), fetchImpl, timeoutMs)
    return buildSpaceWeather({ mode: 'live', events, downloaded: new Date(now).toISOString() })
  } catch (e) {
    return savedSampleWeather(e instanceof LiveError ? e.code : 'network')
  }
}

// The current space weather, read by buildDashboardData. It starts as the saved sample.
let current = null
export function getSpaceWeather() {
  current ??= savedSampleWeather()
  return current
}
export function setSpaceWeather(next) {
  current = next
}

/**
 * React hook: returns the space weather to show. It starts with the saved sample and, only when
 * VITE_NASA_API_KEY is set and the browser is online, replaces it with the live answer, then calls
 * `onChange` so the alerts are rebuilt with the new context.
 */
export function useSpaceWeather(onChange) {
  const [spaceWeather, setState] = useState(() => getSpaceWeather())
  useEffect(() => {
    const apiKey = import.meta.env.VITE_NASA_API_KEY
    if (!apiKey) return undefined
    let alive = true
    loadSpaceWeather({ apiKey, online: typeof navigator === 'undefined' ? true : navigator.onLine }).then((next) => {
      if (!alive || next.mode !== 'live') return
      setSpaceWeather(next)
      setState(next)
      Promise.resolve(onChange?.()).catch(() => {})
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return spaceWeather
}
