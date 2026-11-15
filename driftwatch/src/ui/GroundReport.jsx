import { useEffect, useMemo } from 'react'
import './groundReport.css'
import SimulatedBanner from './SimulatedBanner.jsx'
import StatusBadge from './StatusBadge.jsx'
import { loadReportConfig } from '../data/reportConfig.js'
import { buildGroundReport } from '../report/buildGroundReport.js'
import { flattenReadings } from '../report/flattenReadings.js'
import { formatDateTime, formatDayKey } from '../report/formatTime.js'
import {
  GROUND_REPORT_TITLE,
  GROUND_REPORT_SIMULATED_LINE,
  NO_ACTIVE_ALERTS,
  NO_ESCALATIONS,
  NO_READINGS,
  NO_DATA_LABEL,
  LOADING_DATA,
  CAPPED_NOTE,
  PRINT_LABEL,
  HEADING_MODULES,
  HEADING_ESCALATIONS,
  HEADING_ALERTS,
  HEADING_READINGS,
  RECOMMENDED_ACTION_LABEL,
  moreAlertsText,
  moreReadingsText,
} from './groundReportText.js'

const printWindow = () => {
  if (typeof window !== 'undefined') window.print?.()
}

function PrintButton({ onPrint, disabled }) {
  return (
    <button
      type="button"
      onClick={onPrint}
      disabled={disabled}
      className="min-h-11 min-w-11 rounded bg-teal-400 px-4 py-2 text-base font-semibold text-slate-900 disabled:opacity-50"
    >
      {PRINT_LABEL}
    </button>
  )
}

/**
 * The Ground report screen. Props: { data: DashboardData, now, config, onPrint, refreshing }.
 * `now` comes from the app, so the report never reads the clock. It reads no storage and makes no request.
 */
export default function GroundReport({ data, now, config = loadReportConfig(), onPrint = printWindow, refreshing = false }) {
  const hasNow = typeof now === 'number' && Number.isFinite(now)
  const loading = !data || data.status === 'loading' || refreshing || !hasNow

  const model = useMemo(() => {
    if (loading) return null
    return buildGroundReport({ alerts: data.alerts, readings: flattenReadings(data.readings), rules: data.rules, now, config })
  }, [loading, data, now, config])

  useEffect(() => {
    if (!hasNow) return undefined
    const previous = document.title
    document.title = `Driftwatch ground report ${formatDayKey(now)}`
    return () => {
      document.title = previous
    }
  }, [hasNow, now])

  const toolbar = (
    <div className="no-print mt-3 flex flex-wrap items-center gap-3">
      <PrintButton onPrint={onPrint} disabled={loading} />
    </div>
  )

  if (!model) {
    return (
      <section aria-label={GROUND_REPORT_TITLE} className="text-base">
        <div className="no-print">
          <SimulatedBanner />
        </div>
        {toolbar}
        <p role="status" className="mt-3 text-base">
          {LOADING_DATA}
        </p>
      </section>
    )
  }

  const withAlerts = model.modules.filter((m) => m.activeTotal > 0)

  return (
    <section aria-label={GROUND_REPORT_TITLE} className="text-base">
      <div className="no-print">
        <SimulatedBanner />
      </div>
      {toolbar}

      <article aria-labelledby="report-title" className="report-sheet mt-3 rounded border border-slate-400 p-4">
        <header>
          <p className="font-semibold">Driftwatch</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="report-title" className="text-2xl font-bold">
              {GROUND_REPORT_TITLE}
            </h1>
            <span className="rounded border border-slate-400 px-2 font-semibold">Simulated</span>
          </div>
          <p>
            Generated <time>{formatDateTime(model.now)}</time>
          </p>
          <p>
            Window: <time>{formatDateTime(model.windowStart)}</time> to <time>{formatDateTime(model.windowEnd)}</time>
          </p>
          <p className="simulated-line font-semibold">{GROUND_REPORT_SIMULATED_LINE}</p>
        </header>

        <section aria-labelledby="report-h-modules" className="mt-4">
          <h2 id="report-h-modules" className="text-xl font-semibold">
            {HEADING_MODULES}
          </h2>
          <table className="mt-1 w-full text-left">
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Status</th>
                <th scope="col">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {model.modules.map((m) => (
                <tr key={m.domain}>
                  <th scope="row" className="font-semibold">
                    {m.label}
                  </th>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td>{m.urgency === null ? NO_DATA_LABEL : m.urgency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="report-h-escalations" className="mt-4">
          <h2 id="report-h-escalations" className="text-xl font-semibold">
            {HEADING_ESCALATIONS}
          </h2>
          {model.escalations.length === 0 ? (
            <p>{NO_ESCALATIONS}</p>
          ) : (
            <ul>
              {model.escalations.map((e) => (
                <li key={`${e.domain}/${e.indicator}`}>
                  <span className="font-semibold">{e.label}</span>: <span>{e.indicator}</span>, Urgency {e.urgency}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="report-h-alerts" className="mt-4">
          <h2 id="report-h-alerts" className="text-xl font-semibold">
            {HEADING_ALERTS}
          </h2>
          {withAlerts.length === 0 ? (
            <p>{NO_ACTIVE_ALERTS}</p>
          ) : (
            withAlerts.map((m) => (
              <div key={m.domain}>
                <h3 className="mt-2 text-lg font-semibold">{m.label}</h3>
                <ul>
                  {m.activeAlerts.map((a) => (
                    <li key={`${a.domain}/${a.indicator}`} className="alert-entry mt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={a.status} />
                        <span className="font-semibold">{a.indicator}</span>
                        <span>Urgency {a.urgency}</span>
                      </div>
                      <p>
                        <strong>Why:</strong> <span>{a.why}</span>
                      </p>
                      <p>
                        <strong>{RECOMMENDED_ACTION_LABEL}:</strong> <span>{a.action}</span>
                      </p>
                      <p>
                        <strong>Source:</strong> <span>{a.source}</span>
                      </p>
                    </li>
                  ))}
                </ul>
                {m.moreAlerts > 0 ? <p>{moreAlertsText(m.moreAlerts)}</p> : null}
              </div>
            ))
          )}
        </section>

        <section aria-labelledby="report-h-readings" className="mt-4">
          <h2 id="report-h-readings" className="text-xl font-semibold">
            {HEADING_READINGS}
          </h2>
          {model.lastReadings.length === 0 ? (
            <p>{NO_READINGS}</p>
          ) : (
            <div className="readings-table-wrap">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th scope="col">Module</th>
                    <th scope="col">Indicator</th>
                    <th scope="col">Value</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {model.lastReadings.map((r) => (
                    <tr key={`${r.domain}/${r.indicator}`}>
                      <td>{r.label}</td>
                      <td>{r.indicatorLabel}</td>
                      <td>{r.unit ? `${r.value} ${r.unit}` : String(r.value)}</td>
                      <td>{formatDateTime(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {model.counts.moreReadings > 0 ? <p>{moreReadingsText(model.counts.moreReadings)}</p> : null}
        </section>

        {model.counts.capped ? <p className="capped-note mt-3 font-semibold">{CAPPED_NOTE}</p> : null}
      </article>
    </section>
  )
}
