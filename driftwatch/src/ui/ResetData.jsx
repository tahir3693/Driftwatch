import { useEffect, useRef, useState } from 'react'
/**
 * "Reset stored data" with a confirm step. Props: { onReset() -> Promise }.
 * The first button only asks; the data is deleted only after "Delete saved data".
 */
export default function ResetData({ onReset }) {
  const [step, setStep] = useState('idle') // idle | confirm | busy | done | failed
  const confirmRef = useRef(null)
  const openerRef = useRef(null)
  useEffect(() => {
    if (step === 'confirm') confirmRef.current?.focus()
  }, [step])
  const cancel = () => {
    setStep('idle')
    setTimeout(() => openerRef.current?.focus(), 0)
  }
  const confirm = async () => {
    setStep('busy')
    try {
      await onReset?.()
      setStep('done')
    } catch (e) {
      console.error('Driftwatch: could not reset the stored data', e)
      setStep('failed')
    }
  }
  return (
    <section aria-label="Stored data" className="dw-card no-print p-4">
      <h2 className="text-lg font-bold">Stored data</h2>
      {step === 'confirm' || step === 'busy' ? (
        <div className="mt-2 rounded-lg border-2 border-act bg-act/15 p-3">
          <p ref={confirmRef} tabIndex={-1} className="font-semibold">
            This deletes the data saved on this device.
          </p>
          <p className="text-ink-2">Your check-ins and the BMD and strength tracker records are removed. This cannot be undone.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={confirm} disabled={step === 'busy'} className="dw-btn min-h-11 min-w-11 border-act text-act">
              {step === 'busy' ? <span className="dw-spinner" aria-hidden="true" /> : null}
              Delete saved data
            </button>
            <button type="button" onClick={cancel} disabled={step === 'busy'} className="dw-btn min-h-11 min-w-11">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-ink-2">Remove everything saved on this device and start again with a clean screen.</p>
          <button ref={openerRef} type="button" onClick={() => setStep('confirm')} className="dw-btn mt-3 min-h-11 min-w-11">
            Reset stored data
          </button>
        </>
      )}
      <p role="status" aria-live="polite" className="mt-2 font-semibold">
        {step === 'done' ? 'Saved data deleted.' : step === 'failed' ? 'Could not delete the saved data. Please try again.' : ''}
      </p>
    </section>
  )
}
