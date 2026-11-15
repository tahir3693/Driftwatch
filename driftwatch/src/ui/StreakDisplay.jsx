const TOTAL_MODULES = 5

/** Props: { count, todayModules, increased }. Shows only counts, never a rating of health or results. */
export default function StreakDisplay({ count, todayModules, increased = false }) {
  const idle = count === 0 && todayModules === 0
  const days = count === 1 ? '1 day' : `${count} days`
  return (
    <section aria-label="Check-in streak" className="mt-3 rounded border border-slate-500 p-3">
      <p className="text-base font-semibold">
        {idle ? 'Check-in streak: 0 days. Submit any form to start a streak.' : `Check-in streak: ${days}`}
      </p>
      <p className="text-base">{`Modules checked in today: ${todayModules} of ${TOTAL_MODULES}`}</p>
      {increased ? <p className="text-base">Thank you for checking in.</p> : null}
      <p className="text-base text-slate-300">Simulated</p>
    </section>
  )
}