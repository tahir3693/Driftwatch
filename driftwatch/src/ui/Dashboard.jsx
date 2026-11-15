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
import StatusSummary from './StatusSummary.jsx'
import Glossary from './Glossary.jsx'
import ResetData from './ResetData.jsx'
import { groupByRegion, computeRegionStatus, sortByUrgency } from './regionStatus.js'
import { summarizeAlerts, groupByStatus } from './dashboardSummary.js'
const keyOf = (alert) => `${alert.domain}/${alert.indicator}`
const isOverall = (alert) => alert.indicator === `${alert.domain}_overall`
/**
 * The dashboard. Props: { data: DashboardData, mapping, onLoadScenario, onShowCheckIn, onShowBmd, onPlayScenario,
 * onResetData, spaceWeather, scenarioControls }.
 * `scenarioControls` is an element (the scenario player) shown under the status summary.
 * Top to bottom: banner, status summary with the body map, scenario player, region details, word list,
 * and the reset control.
 * Presentational: it never reads storage or calls the engine.
 */
export default function Dashboard({ data, mapping = defaultMapping, onLoadScenario, onShowCheckIn, onShowBmd, onPlayScenario, onResetData, spaceWeather = null, scenarioControls = null }) {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [helpTarget, setHelpTarget] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const opener = useRef(null)
  const alertsByRegion = useMemo(() => groupByRegion(data.alerts ?? [], mapping), [data.alerts, mapping])
  const summary = useMemo(() => summarizeAlerts(data.alerts ?? [], data.rules ?? {}), [data.alerts, data.rules])
  const region = mapping.regions.find((r) => r.id === selectedRegion) ?? null
  const regionAlerts = region ? sortByUrgency(alertsByRegion[region.id] ?? []) : []
  const regionSummary = computeRegionStatus(regionAlerts)
  const groups = groupByStatus(regionAlerts)
  const isLoading = data.status === 'loading'
  const showSeed = !isLoading && data.hasReadings === false && typeof onLoadScenario === 'function'
  // The most urgent alert is shown in full at the top, unless the same alert is open in the details below.
  const topIsBelow = summary.top ? regionAlerts.some((a) => keyOf(a) === keyOf(summary.top)) : false
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
  const renderAlert = (alert) => {
    const key = keyOf(alert)
    const rule = data.rules?.[key]
    const showChart = !isOverall(alert) && data.readings && Object.prototype.hasOwnProperty.call(data.readings, key)
    return (
      <li key={key}>
        <AlertCard alert={alert} rule={rule} onOpenHelp={(el) => openHelp(alert, el)} />
        {showChart ? <TrendChart alert={alert} rule={rule} readings={data.readings[key]} stats={data.baselineStats?.[key]} /> : null}
      </li>
    )
  }
  return (
    <div className="space-y-4 overflow-x-hidden text-base">
      <SimulatedBanner />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <StatusSummary summary={summary} rules={data.rules ?? {}} loading={isLoading} onShowCheckIn={onShowCheckIn} onPlayScenario={onPlayScenario} compactTop={topIsBelow} />
          {isLoading ? <p className="text-ink-2">Loading data</p> : null}
          {showSeed ? (
            <div className="dw-card p-4">
              <p className="text-base">
                No readings are stored yet. You can load a simulated 14-day scenario to try Driftwatch. <span className="text-ink-2">(Simulated)</span>
              </p>
              <button type="button" onClick={load} disabled={loading} className="dw-btn dw-btn-primary mt-3 min-h-11 min-w-11">
                {loading ? <span className="dw-spinner" aria-hidden="true" /> : null}
                Load simulated 14-day scenario
              </button>
              {loadError ? <p className="mt-2 text-base font-semibold text-act">Could not load the simulated scenario.</p> : null}
            </div>
          ) : null}
        </div>
        <BodyMap alertsByRegion={alertsByRegion} regions={mapping.regions} selectedRegion={selectedRegion} onSelect={selectRegion} />
      </div>
      {scenarioControls}
      <section aria-live="polite" aria-label="Region details" className="min-w-0">
        {!region ? (
          <div className="dw-card p-4">
            <p className="text-base">Select a body region to see its alerts.</p>
            <p className="mt-1 text-ink-2">Use the map above. Each region lists its alerts, most urgent first.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">{region.name}</h2>
              <StatusBadge status={regionSummary.status} />
            </div>
            {region.domains?.includes('radiation') ? <SpaceWeatherLine spaceWeather={spaceWeather} className="dw-card-raised mt-3 space-y-1 p-3" /> : null}
            {region.id === 'bones_and_muscles' ? <BmdTrackerLink onOpen={onShowBmd} /> : null}
            {regionAlerts.length === 0 ? (
              <div className="dw-card mt-3 p-4">
                <p className="text-base">No alerts for this region yet.</p>
                <p className="mt-1 text-ink-2">Do a check-in, or play the simulated scenario, and alerts for this region will appear here.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {groups.act.length > 0 ? (
                  <div>
                    <p className="mb-2 text-lg font-bold text-act">Act now ({groups.act.length})</p>
                    <ul className="space-y-4">{groups.act.map(renderAlert)}</ul>
                  </div>
                ) : null}
                {groups.watch.length > 0 ? (
                  <div>
                    <p className="mb-2 text-lg font-bold text-watch">Keep an eye on ({groups.watch.length})</p>
                    <ul className="space-y-4">{groups.watch.map(renderAlert)}</ul>
                  </div>
                ) : null}
                {groups.other.length > 0 ? <ul className="space-y-4">{groups.other.map(renderAlert)}</ul> : null}
                {groups.normal.length > 0 ? (
                  <details className="dw-details dw-card px-4">
                    <summary className="text-lg">Normal ({groups.normal.length}), nothing to do</summary>
                    <ul className="space-y-4 pb-4">{groups.normal.map(renderAlert)}</ul>
                  </details>
                ) : null}
              </div>
            )}
            {helpTarget ? <HelpPanel rule={data.rules?.[keyOf(helpTarget)]} fallbackTitle={helpTarget.indicator} onClose={closeHelp} /> : null}
          </>
        )}
      </section>
      <Glossary />
      {typeof onResetData === 'function' ? <ResetData onReset={onResetData} /> : null}
    </div>
  )
}
