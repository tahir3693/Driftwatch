// Shows the module status and every alert: why it fired and what to do.
// Color AND a text label, so it never depends on color alone.

const STYLE = {
  normal: { box: "border-emerald-500 bg-emerald-50", label: "Normal" },
  watch: { box: "border-amber-500 bg-amber-50", label: "Watch" },
  act: { box: "border-red-500 bg-red-50", label: "Act" },
};

export function StatusBadge({ status }) {
  const s = STYLE[status];
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${s.box}`}>
      Isolation: {s.label}
    </span>
  );
}

export default function AlertCard({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className={`rounded-lg border-l-4 p-4 ${STYLE.normal.box}`}>
        <p className="font-semibold">Normal</p>
        <p className="text-sm">Everything is close to your own normal. Keep monitoring.</p>
      </div>
    );
  }
  // Most serious first
  const sorted = [...alerts].sort((a, b) => (b.status === "act") - (a.status === "act") || b.urgency - a.urgency);

  return (
    <div className="space-y-3">
      {sorted.map((a) => (
        <article key={a.indicator} className={`rounded-lg border-l-4 p-4 ${STYLE[a.status].box}`}>
          <p className="font-semibold">
            {STYLE[a.status].label} · urgency {a.urgency}/100
          </p>
          <p className="mt-1 text-sm"><strong>Why:</strong> {a.why}</p>
          <p className="mt-1 text-sm"><strong>What to do:</strong> {a.action}</p>
          {a.escalate && (
            <p className="mt-2 text-sm font-semibold">Contact the flight surgeon.</p>
          )}
          <p className="mt-2 text-xs text-slate-600">Source: {a.source}</p>
        </article>
      ))}
      <p className="text-xs text-slate-500">Decision support using simulated data. It does not diagnose.</p>
    </div>
  );
}
