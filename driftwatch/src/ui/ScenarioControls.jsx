/**
 * Controls for the simulated 14-day scenario. Props:
 * { day, days, playing, finished, onPlay, onPause, onNext, onReset }.
 * Grouped as one panel: a clear day label, a progress bar for day 1 to 14, then the buttons.
 */
export default function ScenarioControls({ day, days = 14, playing, finished, onPlay, onPause, onNext, onReset }) {
  const button = 'dw-btn min-h-11 min-w-11'
  const percent = Math.round((Math.min(Math.max(day, 0), days) / days) * 100)
  return (
    <section aria-label="Scenario" className="dw-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Scenario player</h2>
        <span className="rounded-lg border-2 border-watch px-3 py-1 text-base font-bold text-watch">Simulated</span>
      </div>
      <p className="mt-1 text-ink-2">Shared 14-day scenario. Nothing here is a real measurement.</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-2" aria-hidden="true">
        <span className="text-3xl font-bold">{day === 0 ? 'Day 0' : `Day ${day}`}</span>
        <span className="text-ink-2">of {days}</span>
      </p>
      <div
        className="dw-progress mt-1"
        role="progressbar"
        aria-label="Scenario progress"
        aria-valuemin={0}
        aria-valuemax={days}
        aria-valuenow={Math.min(Math.max(day, 0), days)}
        aria-valuetext={day === 0 ? 'Not started' : `Day ${day} of ${days}`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-lg font-semibold" data-testid="scenario-day">
        {day === 0 ? 'Not started: showing stored data' : `Day ${day} of ${days} (Simulated)`}
      </p>
      <div role="group" aria-label="Scenario controls" className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onPlay} disabled={playing} className={`${button} dw-btn-primary`}>
          {finished ? 'Play again' : day > 0 ? 'Resume scenario' : 'Play scenario'}
        </button>
        <button type="button" onClick={onPause} disabled={!playing} className={button}>
          Pause
        </button>
        <button type="button" onClick={onNext} disabled={playing || finished} className={button}>
          Next day
        </button>
        <button type="button" onClick={onReset} disabled={day === 0} className={button}>
          Reset
        </button>
      </div>
    </section>
  )
}
