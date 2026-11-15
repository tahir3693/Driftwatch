import { useMemo, useRef, useState } from 'react'
import defaultMapping from '../data/regionMapping.json'
import SimulatedBanner from './SimulatedBanner.jsx'
import BodyMap from './BodyMap.jsx'
import AlertCard from './AlertCard.jsx'
import TrendChart from './TrendChart.jsx'
import HelpPanel from './HelpPanel.jsx'
import StatusBadge from './StatusBadge.jsx'
import BmdTrackerLink from './BmdTrackerLink.jsx'
import SpaceWeatherLine from './SpaceWeatherLine.jsx'
import { groupByRegion, computeRegionStatus, sortByUrgency } from './regionStatus.js'

const keyOf = (alert) => `${alert.domain}/${alert.indicator}`
const isOverall = (alert) => alert.indicator === `${alert.domain}_overall`

/**
 * The dashboard. Props: { data: DashboardData, mapping, onLoadScenario, onShowCheckIn, onShowBmd, spaceWeather, scenarioControls }.
 * `scenarioControls` is an element (the scenario player) shown under the banner.
 * Presentational: it never reads storage or calls the engine.
 */
export default function Dashboard({ data, mapping = defaultMapping, onLoadScenario, onShowCheckIn, onShowBmd, spaceWeather = null, scenarioControls = null }) {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [helpTarget, setHelpTarget] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const opener = useRef(null)

  const alertsByRegion = useMemo(() => groupByRegion(data.alerts ?? [], mapping), [data.alerts, mapping])
  const region = mapping.regions.find((r) => r.id === selectedRegion) ?? null
  const regionAlerts = region ? sortByUrgency(alertsByRegion[region.id] ?? []) : []
  const regionSummary = computeRegionStatus(regionAlerts)
  const isLoading = data.status === 'loading'
  const showSeed = !isLoading && data.hasReadings === false && typeof onLoadScenario === 'function'

  const openHelp = (alert, el) => {
    opener.current = el
    setHelpTarget(alert)
  }
  const closeHelp = () => {
    setHelpTarget(null)
    const el = opener.current
    opener.current = null
    if (el && el.isConnected) el.focus()
  }
  const selectRegion = (id) => {
    if (id !== selectedRegion) {
      setHelpTarget(null)
      opener.current = null
    }
    setSelectedRegion(id)
  }
  const load = async () => {
    setLoadError(false)
    setLoading(true)
    try {
      await onLoadScenario()
    } catch (e) {
      console.error('Driftwatch: could not load the simulated scenario', e)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overflow-x-hidden text-base">
      <SimulatedBanner />
      {scenarioControls}
      <div className="flex flex-wrap gap-2">
        {typeof onShowCheckIn === 'function' ? (
          <button
            type="button"
            onClick={onShowCheckIn}
            className="mt-3 min-h-11 min-w-11 rounded border border-slate-400 px-4 py-2 text-base font-semibold"
          >
            Check-in
          </button>
        ) : null}
        {typeof onShowBmd === 'function' ? (
          <button
            type="button"
            onClick={onShowBmd}
            className="mt-3 min-h-11 min-w-11 rounded border border-slate-400 px-4 py-2 text-base font-semibold"
          >
            BMD and strength
          </button>
        ) : null}
      </div>
      {isLoading ? <p className="mt-3 text-base">Loading data</p> : null}
      {showSeed ? (
        <div className="mt-3 rounded border border-slate-500 p-3">
          <p className="text-base">
            No readings are stored yet. You can load a simulated 14-day scenario to try Driftwatch. <span className="text-slate-300">(Simulated)</span>
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="mt-2 min-h-11 min-w-11 rounded bg-teal-400 px-4 py-2 text-base font-semibold text-slate-900 disabled:opacity-50"
          >
            Load simulated 14-day scenario
          </button>
          {loadError ? <p className="mt-2 text-base font-semibold">Could not load the simulated scenario.</p> : null}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BodyMap alertsByRegion={alertsByRegion} regions={mapping.regions} selectedRegion={selectedRegion} onSelect={selectRegion} />
        <section aria-live="polite" aria-label="Region details">
          {!region ? (
            <p className="text-base">Select a body region to see its alerts.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{region.name}</h2>
                <StatusBadge status={regionSummary.status} />
              </div>
              {region.domains?.includes('radiation') ? <SpaceWeatherLine spaceWeather={spaceWeather} className="mt-2" /> : null}
              {region.id === 'bones_and_muscles' ? <BmdTrackerLink onOpen={onShowBmd} /> : null}
              {regionAlerts.length === 0 ? (
                <p className="mt-2 text-base">No alerts for this region yet.</p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {regionAlerts.map((alert) => {
                    const key = keyOf(alert)
                    const rule = data.rules?.[key]
                    const showChart = !isOverall(alert) && data.readings && Object.prototype.hasOwnProperty.call(data.readings, key)
                    return (
                      <li key={key}>
                        <AlertCard alert={alert} rule={rule} onOpenHelp={(el) => openHelp(alert, el)} />
                        {showChart ? (
                          <TrendChart alert={alert} rule={rule} readings={data.readings[key]} stats={data.baselineStats?.[key]} />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
              {helpTarget ? <HelpPanel rule={data.rules?.[keyOf(helpTarget)]} fallbackTitle={helpTarget.indicator} onClose={closeHelp} /> : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
