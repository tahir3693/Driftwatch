import { useMemo, useState } from "react";
import rules from "./rules.json";
import { isolationInputs } from "./scenarioInputs.js";
import { evaluateIsolation, overallOf, baselineFor } from "./isolationEngine.js";
import CheckinForm from "./CheckinForm.jsx";
import ReactionTest from "./ReactionTest.jsx";
import TrendChart from "./TrendChart.jsx";
import AlertCard, { StatusBadge } from "./AlertCard.jsx";
import HelpPanel from "./HelpPanel.jsx";

// Local demo page for the Isolation module (the shared app has its own screens).
export default function IsolationPage() {
  const [days, setDays] = useState(isolationInputs);
  const [reactionMs, setReactionMs] = useState(null);
  const [day, setDay] = useState(1);

  const total = days.length;
  const shown = Math.min(day, total);
  const history = useMemo(() => days.slice(0, shown), [days, shown]);

  const alerts = useMemo(() => evaluateIsolation(history, { rules }), [history]);
  const overall = overallOf(alerts);
  const visible = alerts.filter((a) => a.status !== "normal" && a !== overall);

  function handleCheckin(record) {
    setDays((prev) => [...prev, { day: prev.length + 1, ...record }]);
    setDay(total + 1);
    setReactionMs(null);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Driftwatch · Isolation</h1>
        <StatusBadge status={overall.status} />
      </header>
      <p className="rounded bg-slate-100 p-2 text-sm">
        All data here is <strong>simulated</strong>. Decision support only. It does not diagnose.
      </p>

      <section aria-label="Day slider">
        <label className="block text-sm font-medium">
          Day {shown} of {total}
          <input type="range" min="1" max={total} value={shown}
            onChange={(e) => setDay(Number(e.target.value))} className="mt-1 w-full" />
        </label>
      </section>

      <AlertCard alerts={visible} />

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(rules.indicators).map(([key, ind]) => {
          const base = baselineFor(days, key, rules);
          if (!base) return null;
          return (
            <TrendChart key={key} title={ind.label} unit={ind.unit}
              values={history.map((d) => d[key])} baseline={base} />
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReactionTest durationSec={30} onComplete={(r) => setReactionMs(r.value)} />
        <CheckinForm onSubmit={handleCheckin} reactionMs={reactionMs} />
      </div>

      <HelpPanel />
    </main>
  );
}
