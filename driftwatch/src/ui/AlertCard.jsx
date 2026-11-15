import { alertCardModel } from './alertModel.js'
import StatusBadge, { StatusIcon } from './StatusBadge.jsx'
import { styleFor } from './statusStyle.js'
import { ESCALATION_TEXT } from './wording.js'
/**
 * One alert, in reading order: status, what is happening (Why), what to do (Suggested action),
 * the numbers, then How to measure and Why it matters (collapsible), then the Source in smaller text.
 * Props: { alert, rule, onOpenHelp(openerEl) }.
 */
export default function AlertCard({ alert, rule, onOpenHelp }) {
  const m = alertCardModel(alert, rule)
  const edge = styleFor(alert.status).classes.split(' ')[0]
  return (
    <article className={`dw-card border-l-8 p-4 ${edge}`} aria-label={`${m.title}: ${m.statusLabel}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold">{m.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={alert.status} />
          <span className="text-base text-ink-2">Simulated</span>
        </div>
      </header>
      {m.escalate ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border-2 border-act bg-act/15 p-3 text-base font-bold">
          <StatusIcon status="act" size={20} />
          <span>{ESCALATION_TEXT}</span>
        </p>
      ) : null}
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="font-semibold text-ink-2">Why</dt>
          <dd>{m.why}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-2">Suggested action</dt>
          <dd className="text-lg font-semibold">{m.action}</dd>
        </div>
      </dl>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-raised px-3 py-2">
        <div>
          <dt className="inline font-semibold" title="A score from 0 to 100. A higher number means it needs attention sooner.">
            Urgency:{' '}
          </dt>
          <dd className="inline">{m.urgency}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Value: </dt>
          <dd className="inline">{m.valueText}</dd>
        </div>
        <div>
          <dt className="inline font-semibold" title="Your own usual value, worked out from your earlier readings.">
            Baseline:{' '}
          </dt>
          <dd className="inline">{m.baselineText}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <details className="dw-details">
          <summary>How to measure</summary>
          <p className="pb-3 pl-4">{m.howToMeasure}</p>
        </details>
        <details className="dw-details">
          <summary>Why it matters</summary>
          <p className="pb-3 pl-4">{m.whyItMatters}</p>
        </details>
      </div>
      <dl className="mt-2 border-t border-line pt-2 text-sm text-ink-2">
        <dt className="inline font-semibold">Source</dt> <dd className="inline">{m.source}</dd>
      </dl>
      <button type="button" onClick={(e) => onOpenHelp?.(e.currentTarget)} className="dw-btn mt-3 min-h-11 min-w-11">
        Help <span className="sr-only">for {m.title}</span>
      </button>
    </article>
  )
}
