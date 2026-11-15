import { useEffect, useRef, useState } from "react";

// PVT-style tap test.
// A signal appears after a random wait. Tap as fast as you can.
// When time is up, we compute the MEDIAN reaction time and call onComplete.
//
// Props:
//   durationSec  total test length (default 60)
//   onComplete   function({ indicator, value, unit, ts, source, trials, falseStarts })
//                The shared store (Dexie) saves it. This component does not store anything.

const MIN_WAIT_MS = 2000;
const MAX_WAIT_MS = 8000;

export function median(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function ReactionTest({ durationSec = 60, onComplete }) {
  // phase: idle | waiting | signal | done
  const [phase, setPhase] = useState("idle");
  const [times, setTimes] = useState([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [lastMs, setLastMs] = useState(null);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [result, setResult] = useState(null);

  const waitTimer = useRef(null);
  const clockTimer = useRef(null);
  const signalAt = useRef(0);
  const endAt = useRef(0);
  const timesRef = useRef([]);
  const falseRef = useRef(0);

  function clearTimers() {
    clearTimeout(waitTimer.current);
    clearInterval(clockTimer.current);
  }

  useEffect(() => clearTimers, []);

  function scheduleSignal() {
    setPhase("waiting");
    const wait = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    waitTimer.current = setTimeout(() => {
      signalAt.current = performance.now();
      setPhase("signal");
    }, wait);
  }

  function start() {
    timesRef.current = [];
    falseRef.current = 0;
    setTimes([]);
    setFalseStarts(0);
    setLastMs(null);
    setResult(null);
    setTimeLeft(durationSec);
    endAt.current = performance.now() + durationSec * 1000;

    clockTimer.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - performance.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 250);

    scheduleSignal();
  }

  function finish() {
    clearTimers();
    const value = median(timesRef.current);
    const payload = {
      indicator: "reaction_median_ms",
      value: value === null ? null : Math.round(value),
      unit: "ms",
      ts: new Date().toISOString(),
      source: "reaction_test",
      trials: timesRef.current.length,
      falseStarts: falseRef.current,
    };
    setResult(payload);
    setPhase("done");
    if (value !== null && onComplete) onComplete(payload);
  }

  function handleTap() {
    if (phase === "waiting") {
      // Tapped too early
      clearTimeout(waitTimer.current);
      falseRef.current += 1;
      setFalseStarts(falseRef.current);
      scheduleSignal();
    } else if (phase === "signal") {
      const ms = Math.round(performance.now() - signalAt.current);
      if (ms <= 2000) {
        timesRef.current = [...timesRef.current, ms];
        setTimes(timesRef.current);
      }
      setLastMs(ms);
      scheduleSignal();
    }
  }

  const padStyle = {
    idle: "bg-slate-200 text-slate-700",
    waiting: "bg-slate-700 text-white",
    signal: "bg-emerald-500 text-white",
    done: "bg-slate-200 text-slate-700",
  }[phase];

  const padText = {
    idle: "Press Start",
    waiting: "Wait for green...",
    signal: "TAP!",
    done: "Finished",
  }[phase];

  return (
    <section className="max-w-md space-y-4" aria-label="Reaction test">
      <h2 className="text-xl font-semibold">Reaction test</h2>
      <p className="text-sm text-slate-600">
        Wait for the green signal, then tap as fast as you can. If you tap too early, it
        does not count. Simulated test for decision support only.
      </p>

      {phase === "idle" || phase === "done" ? (
        <button
          onClick={start}
          className="rounded-md bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {phase === "done" ? "Run again" : "Start test"}
        </button>
      ) : (
        <p className="text-sm" aria-live="polite">
          Time left: <strong>{timeLeft}s</strong> · Taps: <strong>{times.length}</strong> ·
          Too early: <strong>{falseStarts}</strong>
        </p>
      )}

      <button
        onPointerDown={handleTap}
        disabled={phase === "idle" || phase === "done"}
        className={`flex h-48 w-full select-none items-center justify-center rounded-xl text-2xl font-bold transition-colors ${padStyle}`}
      >
        {padText}
      </button>

      {lastMs !== null && phase !== "done" && (
        <p className="text-sm text-slate-600">Last tap: {lastMs} ms</p>
      )}

      {phase === "done" && result && (
        <div className="rounded-md border border-slate-300 p-3 text-sm">
          {result.value === null ? (
            <p>No valid taps. Try again.</p>
          ) : (
            <>
              <p>
                Median reaction time: <strong>{result.value} ms</strong>
              </p>
              <p className="text-slate-600">
                {result.trials} taps, {result.falseStarts} too early.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
