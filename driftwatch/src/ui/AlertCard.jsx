import { alertCardModel } from './alertModel.js'
import StatusBadge, { StatusIcon } from './StatusBadge.jsx'
import { ESCALATION_TEXT } from './wording.js'

/** One alert. Props: { alert, rule, onOpenHelp(openerEl) }. */
export default function AlertCard({ alert, rule, onOpenHelp }) {
  const m = alertCardModel(alert, rule)
  return (
    <article className="rounded border border-slate-500 p-3" aria-label={`${m.title}: ${m.statusLabel}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">{m.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={alert.status} />
          <span className="text-base text-slate-300">Simulated</span>
        </div>
      </header>
      <dl className="mt-2 space-y-1 text-base">
        <div>
          <dt className="inline font-semibold">Urgency: </dt>
          <dd className="inline">{m.urgency}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Value: </dt>
          <dd className="inline">{m.valueText}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Baseline: </dt>
          <dd className="inline">{m.baselineText}</dd>
        </div>
        <div>
          <dt className="font-semibold">Why</dt>
          <dd>{m.why}</dd>
        </div>
        <div>
          <dt className="font-semibold">Suggested action</dt>
          <dd>{m.action}</dd>
        </div>
        <div>
          <dt className="font-semibold">How to measure</dt>
          <dd>{m.howToMeasure}</dd>
        </div>
        <div>
          <dt className="font-semibold">Why it matters</dt>
          <dd>{m.whyItMatters}</dd>
        </div>
        <div>
          <dt className="font-semibold">Source</dt>
          <dd>{m.source}</dd>
        </div>
      </dl>
      {m.escalate ? (
        <p className="mt-2 flex items-center gap-2 rounded border-2 border-red-400 p-2 text-base font-semibold">
          <StatusIcon status="act" />
          <span>{ESCALATION_TEXT}</span>
        </p>
      ) : null}
      <button
        type="button"
        onClick={(e) => onOpenHelp?.(e.currentTarget)}
        className="mt-3 min-h-11 min-w-11 rounded border border-slate-400 px-4 py-2 text-base"
      >
        Help{' '}
        <span className="sr-only">for {m.title}</span>
      </button>
    </article>
  )
}
