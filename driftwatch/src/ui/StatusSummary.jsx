import StatusBadge from './StatusBadge.jsx'
import { styleFor } from './statusStyle.js'
import { alertCardModel } from './alertModel.js'

/**
 * The block at the top of the dashboard: overall status in words, counts, an escalation banner and the
 * most urgent alert. Props: { summary, rules, loading, onShowCheckIn, compactTop }.
 * `compactTop` hides the why, action and source of the most urgent alert because the same alert is
 * already open in the region details below (so the same text is not read twice).
 */
export default function StatusSummary({ summary, rules = {}, loading = false, onShowCheckIn, compactTop = false }) {
  const checkIn =
    typeof onShowCheckIn === 'function' ? (
      <button type="button" onClick={onShowCheckIn} className="dw-btn dw-btn-primary min-h-11 min-w-11">
        Check-in
      </button>
    ) : null
  if (loading) {
    return (
      <section aria-label="Status summary" className="dw-card p-4">
        <p className="flex items-center gap-3 text-lg font-semibold">
          <span className="dw-spinner" aria-hidden="true" />
          Checking your data
        </p>
      </section>
    )
  }
  if (summary.empty) {
    return (
      <section aria-label="Status summary" className="dw-card p-4">
        <p className="text-xl font-bold">No alerts yet</p>
        <p className="mt-1 text-ink-2">
          There is nothing to show yet. Do a check-in to add today's readings, or play the simulated scenario below to see how Driftwatch works.
        </p>
        {checkIn ? <div className="mt-3">{checkIn}</div> : null}
      </section>
    )
  }
  const top = summary.top
  const topRule = top ? rules[`${top.domain}/${top.indicator}`] : undefined
  const topModel = top ? alertCardModel(top, topRule) : null
  return (
    <section aria-label="Status summary" className="space-y-3">
      <div className={`dw-card border-l-8 p-4 ${styleFor(summary.status).classes.split(' ')[0]}`}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={summary.status} large />
          <p className="text-xl font-bold" data-testid="status-headline">
            {summary.headline}
          </p>
        </div>
        <p className="mt-2 text-ink-2">
          Normal: nothing to do. Watch: keep an eye on it. Act: follow the suggested action now.
        </p>
        {checkIn ? <div className="mt-3">{checkIn}</div> : null}
      </div>
      {summary.escalations.length > 0 ? (
        <div role="note" aria-label="Escalation" className="flex gap-3 rounded-xl border-2 border-act bg-act/15 p-4">
          <svg width="28" height="28" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="mt-1 shrink-0">
            <rect x="2" y="2" width="12" height="12" fill="currentColor" className="text-act" />
          </svg>
          <div>
            <p className="text-xl font-bold">Contact the flight surgeon</p>
            <p>These alerts ask you to escalate: {summary.escalations.join(', ')}.</p>
          </div>
        </div>
      ) : null}
      {topModel ? (
        <section aria-label="Most urgent alert" className={`dw-card border-2 p-4 ${styleFor(top.status).classes.split(' ')[0]}`}>
          <p className="text-base font-semibold text-ink-2">Most urgent alert</p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-bold">{topModel.title}</p>
            <StatusBadge status={top.status} />
          </div>
          {compactTop ? (
            <p className="mt-2 text-ink-2">The details are open below.</p>
          ) : (
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="font-semibold text-ink-2">What is happening</dt>
                <dd>{topModel.why}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-2">What to do</dt>
                <dd className="text-lg font-semibold">{topModel.action}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-ink-2">Source</dt>
                <dd className="text-sm text-ink-2">{topModel.source}</dd>
              </div>
            </dl>
          )}
        </section>
      ) : (
        <p className="dw-card p-4 text-lg font-semibold">All indicators are Normal. Keep up your check-ins.</p>
      )}
    </section>
  )
}
