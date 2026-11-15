import rules from "./rules.json";

// "How to measure it" and "why it matters" for each indicator, read from rules.json.
export default function HelpPanel() {
  return (
    <section className="rounded-lg border border-slate-300 p-4" aria-label="Help">
      <h2 className="mb-2 text-lg font-semibold">Help: what each number means</h2>
      <div className="space-y-2">
        {Object.entries(rules.indicators).map(([key, r]) => (
          <details key={key} className="rounded border border-slate-200 p-2">
            <summary className="cursor-pointer text-sm font-medium">{r.label}</summary>
            <p className="mt-2 text-sm"><strong>How to measure:</strong> {r.howToMeasure}</p>
            <p className="mt-1 text-sm"><strong>Why it matters:</strong> {r.whyItMatters}</p>
            <p className="mt-1 text-xs text-slate-600">Source: {r.source}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
