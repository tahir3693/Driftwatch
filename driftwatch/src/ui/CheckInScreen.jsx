import { useState } from 'react'
import SimulatedBanner from './SimulatedBanner.jsx'
import StreakDisplay from './StreakDisplay.jsx'
import BackButton from './BackButton.jsx'
import EnvironmentForm from './EnvironmentForm.jsx'
import RadiationForm from './RadiationForm.jsx'
import IsolationForm from './IsolationForm.jsx'
import GravityForm from './GravityForm.jsx'
import NutritionForm from './NutritionForm.jsx'
import { FORMS, RESULT_TEXT } from './checkinText.js'

const COMPONENTS = {
  environment: EnvironmentForm,
  radiation: RadiationForm,
  isolation: IsolationForm,
  gravity: GravityForm,
  nutrition: NutritionForm,
}

const initialValues = () => ({
  environment: { co2: '', headache: null, nauseaFatigue: null, temperature: '' },
  radiation: { symptoms: { nausea: false, vomiting: false, fatigue: false, skin: false, fever: false, bruising: false } },
  isolation: { sleep: '', mood: '', social: '', reaction: '' },
  gravity: { exercise: '' },
  nutrition: { intake: '' },
})

/**
 * Props: { onSubmit(module, raw) -> Promise<{ status, errors?, streakBefore?, streakAfter? }>, streak, onShowDashboard }.
 * Presentational: it never reads storage. Entered values stay after a submit.
 */
export default function CheckInScreen({ onSubmit, streak = { count: 0, todayModules: 0, increased: false }, onShowDashboard }) {
  const [values, setValues] = useState(initialValues)
  const [results, setResults] = useState({})
  const [busy, setBusy] = useState({})
  const [announcement, setAnnouncement] = useState('')

  const titleOf = (module) => FORMS.find((f) => f.module === module).title

  const submit = async (module) => {
    setBusy((b) => ({ ...b, [module]: true }))
    setResults((r) => ({ ...r, [module]: undefined }))
    let result
    try {
      result = await onSubmit(module, values[module])
    } catch (e) {
      console.error('Driftwatch: check-in submit failed', e)
      result = { status: 'save_failed' }
    }
    setResults((r) => ({ ...r, [module]: result }))
    const text = result.status === 'invalid' ? result.errors?.[0]?.message : RESULT_TEXT[result.status]
    setAnnouncement(text ? `${titleOf(module)}: ${text}` : '')
    setBusy((b) => ({ ...b, [module]: false }))
  }

  return (
    <section aria-label="Daily check-in" className="overflow-x-hidden text-base">
      <SimulatedBanner />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Daily check-in</h2>
        <BackButton onClick={onShowDashboard} />
      </div>
      <p className="mt-1 text-ink-2">Answer the modules you can today. Each one saves on its own and updates your alerts.</p>
      <StreakDisplay count={streak.count} todayModules={streak.todayModules} increased={streak.increased} />
      <div data-testid="checkin-live" aria-live="polite" role="status" className="mt-3 min-h-6 text-base font-semibold text-ink-2">
        {announcement}
      </div>
      <div className="mt-3 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {FORMS.map(({ module }) => {
          const Form = COMPONENTS[module]
          const result = results[module]
          return (
            <Form
              key={module}
              value={values[module]}
              onChange={(next) => setValues((v) => ({ ...v, [module]: next }))}
              onSubmit={() => submit(module)}
              errors={result?.status === 'invalid' ? result.errors : undefined}
              resultText={result ? RESULT_TEXT[result.status] : undefined}
              submitting={busy[module] === true}
            />
          )
        })}
      </div>
    </section>
  )
}