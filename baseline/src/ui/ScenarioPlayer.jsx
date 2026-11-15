import { useEffect, useMemo, useState } from 'react'
import { buildDefaultScenario, playDay, MODULE_DOMAINS } from '../sim/playScenario.js'
import { SCENARIO_DAYS } from '../sim/scenario.js'
import { loadCutoffs } from '../data/cutoffs.js'

const STEP_MS = 1500
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const LABEL = {
  radiation: 'Radiation',
  isolation: 'Isolation',
  gravity: 'Altered gravity',
  environment: 'Closed environment',
  nutrition: 'Nutrition',
}
const ICON = { normal: 'o', watch: '!', act: 'X' }

/** Loads the shared simulated scenario day by day and shows what the engine returns each day. */
export default function ScenarioPlayer() {
  const days = useMemo(() => buildDefaultScenario(), [])
  const cutoffs = useMemo(() => loadCutoffs(), [])
  const [day, setDay] = useState(0) // 0 = not started, 1..14 = days loaded so far
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      setDay((d) => {
        if (d >= SCENARIO_DAYS) return d
        return d + 1
      })
    }, STEP_MS)
    return () => clearInterval(id)
  }, [playing])

  useEffect(() => {
    if (day >= SCENARIO_DAYS) setPlaying(false)
  }, [day])

  const result = useMemo(() => (day > 0 ? playDay(days, day, cutoffs) : null), [day, days, cutoffs])
  const overall = (domain) => result?.alerts.find((a) => a.indicator === `${domain}_overall`)
  const active = result ? result.alerts.filter((a) => a.status !== 'normal' && !a.indicator.endsWith('_overall')) : []
  const finished = day >= SCENARIO_DAYS

  return (
    <section aria-labelledby="scenario-heading" className="mt-6 max-w-3xl">
      <h2 id="scenario-heading" className="text-2xl font-semibold">
        Scenario
      </h2>
      <p className="mt-1 text-base text-slate-300">
        A shared 14-day scenario. Simulated data: nothing here is a real measurement.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (finished) setDay(0)
            setPlaying(true)
          }}
          disabled={playing}
          className="min-h-11 rounded bg-teal-400 px-4 py-2 text-base font-semibold text-slate-900 disabled:opacity-50"
        >
          {finished ? 'Play again' : day > 0 ? 'Resume scenario' : 'Play scenario'}
        </button>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          disabled={!playing}
          className="min-h-11 rounded border border-slate-400 px-4 py-2 text-base disabled:opacity-50"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => setDay((d) => Math.min(SCENARIO_DAYS, d + 1))}
          disabled={playing || finished}
          className="min-h-11 rounded border border-slate-400 px-4 py-2 text-base disabled:opacity-50"
        >
          Next day
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false)
            setDay(0)
          }}
          disabled={day === 0}
          className="min-h-11 rounded border border-slate-400 px-4 py-2 text-base disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-lg font-semibold" data-testid="scenario-day">
        {day === 0 ? 'Not started' : `Day ${day} of ${SCENARIO_DAYS}`} (Simulated)
        {finished ? ': ground report ready' : ''}
      </p>

      {result ? (
        <>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Status per module">
            {MODULE_DOMAINS.map((domain) => {
              const o = overall(domain)
              return (
                <li key={domain} className="rounded border border-slate-500 p-3" data-testid={`module-${domain}`}>
                  <p className="font-semibold">{LABEL[domain]}</p>
                  <p>
                    <span aria-hidden="true">{ICON[o.status]} </span>
                    {capitalise(o.status)} (urgency {o.urgency})
                  </p>
                  {o.escalate ? (
                    <p className="font-semibold">Escalate: contact the flight surgeon or crew support.</p>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <h3 className="mt-4 text-xl font-semibold">Active alerts</h3>
          {active.length === 0 ? (
            <p className="mt-1 text-base text-slate-300">No active alerts today.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {active.map((a) => (
                <li key={`${a.domain}-${a.indicator}`} className="rounded border border-slate-500 p-3">
                  <p className="font-semibold">
                    {LABEL[a.domain]}: {a.indicator.replaceAll('_', ' ')} ({capitalise(a.status)}, urgency {a.urgency})
                  </p>
                  <p>{a.why}</p>
                  <p>Suggested action: {a.action}</p>
                  <p className="text-sm text-slate-300">Source: {a.source}</p>
                  {a.escalate ? <p className="font-semibold">Escalate: contact the flight surgeon or crew support.</p> : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
