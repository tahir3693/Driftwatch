// Pure helpers for NASA DONKI SEP (solar energetic particle events). No network, no storage, no clock.
// DONKI SEP lists when an event happened and which notifications NASA sent. It gives no proton flux
// and no dose, so the events are shown as context only and never scored.
export const DONKI_SEP_ENDPOINT = 'https://api.nasa.gov/DONKI/SEP'
export const LIVE_WINDOW_DAYS = 30

const isEvent = (e) => e !== null && typeof e === 'object' && typeof e.eventTime === 'string' && Number.isFinite(Date.parse(e.eventTime))

/**
 * The address without the api_key parameter (and without any stray line break).
 * Returns the plain DONKI address when the input is not a usable string.
 */
export function plainDonkiUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return DONKI_SEP_ENDPOINT
  const cleaned = url.replace(/\\n|\s+/g, '')
  const [base, query = ''] = cleaned.split('?')
  const kept = query.split('&').filter((p) => p && !/^api_key(=|$)/i.test(p))
  return kept.length ? `${base}?${kept.join('&')}` : base
}

/** Address for a live request: the last LIVE_WINDOW_DAYS days up to `now`, with the key. Never log or show it. */
export function liveRequestUrl(now, apiKey) {
  const day = (ms) => new Date(ms).toISOString().slice(0, 10)
  const start = day(now - LIVE_WINDOW_DAYS * 86_400_000)
  return `${DONKI_SEP_ENDPOINT}?startDate=${start}&endDate=${day(now)}&api_key=${encodeURIComponent(apiKey)}`
}

/** The events of a DONKI answer: a list (live) or a saved file with an `events` list. Throws on any other shape. */
export function parseEvents(raw) {
  const list = Array.isArray(raw) ? raw : raw !== null && typeof raw === 'object' ? raw.events : undefined
  if (!Array.isArray(list)) throw new Error('DONKI answer has no event list')
  return list.filter(isEvent)
}

/** Latest event by eventTime (the later one in the list wins a tie), or null. */
export function latestEvent(events) {
  let best = null
  for (const e of Array.isArray(events) ? events : []) {
    if (isEvent(e) && (best === null || Date.parse(e.eventTime) >= Date.parse(best.eventTime))) best = e
  }
  return best
}

const eventTimeText = (iso) => iso.replace('T', ' ').replace(/Z$/, ' UTC')
const notificationCount = (e) => (Array.isArray(e?.sentNotifications) ? e.sentNotifications.length : 0)
const dateOnly = (iso) => (typeof iso === 'string' && Number.isFinite(Date.parse(iso)) ? iso.slice(0, 10) : 'date unknown')

/**
 * The space weather object the app passes around.
 * input: { mode: 'sample' | 'live', events, downloaded?, url? }.
 */
export function buildSpaceWeather({ mode, events, downloaded, url, liveError }) {
  const list = parseEvents({ events })
  const latestRaw = latestEvent(list)
  const latest = latestRaw
    ? { sepID: latestRaw.sepID ?? null, eventTime: latestRaw.eventTime, notifications: notificationCount(latestRaw) }
    : null
  const live = mode === 'live'
  const line = live
    ? 'Space weather: NASA DONKI (live)'
    : `Space weather: NASA DONKI (saved sample, downloaded ${dateOnly(downloaded)})`
  const note = live
    ? 'The DONKI events are live NASA data. The scenario values in Driftwatch are simulated. DONKI gives no flux or dose for an event, so the events are context only and are not scored.'
    : 'The DONKI events are a real NASA sample saved for May to June 2024. The scenario values in Driftwatch are simulated. DONKI gives no flux or dose for an event, so the events are context only and are not scored.'
  const latestText = latest
    ? `Latest DONKI event: ${eventTimeText(latest.eventTime)}.`
    : 'DONKI lists no solar energetic particle events for this period.'
  return {
    mode: live ? 'live' : 'sample',
    downloaded: typeof downloaded === 'string' ? downloaded : null,
    url: plainDonkiUrl(url),
    count: list.length,
    latest,
    line,
    note,
    latestText,
    ...(liveError ? { liveError } : {}),
  }
}

/**
 * Context sentence appended to the why text of solar_proton_flux. It states the date of the latest
 * event and that DONKI gives no flux or dose, and says nothing about the event's size.
 */
export function whyContext(spaceWeather) {
  if (!spaceWeather || typeof spaceWeather !== 'object') return ''
  const source = spaceWeather.mode === 'live' ? 'live' : 'saved sample'
  const latest = spaceWeather.latest
  if (!latest) {
    return `Space weather context (NASA DONKI, ${source}): no solar energetic particle events are listed for this period. This is context only and does not change the score.`
  }
  const n = latest.notifications ?? 0
  const notice = n > 0 ? `NASA sent ${n} notification${n === 1 ? '' : 's'} for it` : 'No NASA notification is listed for it'
  return `Space weather context (NASA DONKI, ${source}): the latest solar energetic particle event listed is ${eventTimeText(latest.eventTime)}. ${notice}. DONKI gives no flux or dose, so this is context only and does not change the score.`
}
