/**
 * Controls for the simulated 14-day scenario. Props:
 * { day, days, playing, finished, onPlay, onPause, onNext, onReset }.
 */
export default function ScenarioControls({ day, days = 14, playing, finished, onPlay, onPause, onNext, onReset }) {
  const button = 'min-h-11 min-w-11 rounded px-4 py-2 text-base font-semibold disabled:opacity-50'
  return (
    <section aria-label="Scenario" className="mt-3 rounded border border-slate-500 p-3">
      <p className="text-base">
        Shared 14-day scenario. <span className="font-semibold">Simulated</span>: nothing here is a real measurement.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onPlay} disabled={playing} className={`${button} bg-teal-400 text-slate-900`}>
          {finished ? 'Play again' : day > 0 ? 'Resume scenario' : 'Play scenario'}
        </button>
        <button type="button" onClick={onPause} disabled={!playing} className={`${button} border border-slate-400`}>
          Pause
        </button>
        <button type="button" onClick={onNext} disabled={playing || finished} className={`${button} border border-slate-400`}>
          Next day
        </button>
        <button type="button" onClick={onReset} disabled={day === 0} className={`${button} border border-slate-400`}>
          Reset
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-lg font-semibold" data-testid="scenario-day">
        {day === 0 ? 'Not started: showing stored data' : `Day ${day} of ${days} (Simulated)`}
      </p>
    </section>
  )
}
