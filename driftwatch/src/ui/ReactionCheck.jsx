import { useCallback, useEffect, useRef, useState } from 'react'
import { nextWaitMs, summarizeReaction } from '../engine/reaction.js'
import { loadCheckinConfig } from '../data/checkinData.js'
import { REACTION } from './checkinText.js'

const SOFT_STOP_MS = 60 * 1000
const HARD_STOP_MS = 2 * 60 * 1000

/**
 * Optional reaction check. onResult(medianMsOrNull) is called when it ends or is skipped.
 * One button does everything (click, Space and Enter all fire its click): start, then tap.
 * The prompt sits in a polite live region.
 */
export default function ReactionCheck({ onResult }) {
  const [phase, setPhase] = useState('idle') // idle | waiting | prompt | done | skipped
  const [message, setMessage] = useState('')
  const [median, setMedian] = useState(null)
  const phaseRef = useRef('idle')
  const times = useRef([])
  const promptAt = useRef(0)
  const waitTimer = useRef(null)
  const softTimer = useRef(null)
  const hardTimer = useRef(null)
  const softReached = useRef(false)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const go = (next) => {
    phaseRef.current = next
    setPhase(next)
  }
  const clearTimers = () => {
    clearTimeout(waitTimer.current)
    clearTimeout(softTimer.current)
    clearTimeout(hardTimer.current)
    waitTimer.current = softTimer.current = hardTimer.current = null
  }
  useEffect(() => clearTimers, [])

  const finish = useCallback(() => {
    clearTimers()
    const summary = summarizeReaction(times.current, loadCheckinConfig().reactionMinTaps)
    go('done')
    if (summary.ok) {
      const rounded = Math.round(summary.median)
      setMedian(rounded)
      setMessage('')
      onResultRef.current?.(rounded)
    } else {
      setMedian(null)
      setMessage(summary.message)
      onResultRef.current?.(null)
    }
  }, [])

  const scheduleWait = useCallback(() => {
    go('waiting')
    waitTimer.current = setTimeout(() => {
      promptAt.current = performance.now()
      go('prompt')
    }, nextWaitMs(Math.random()))
  }, [])

  const start = () => {
    clearTimers()
    times.current = []
    softReached.current = false
    setMedian(null)
    setMessage('')
    onResultRef.current?.(null)
    softTimer.current = setTimeout(() => {
      softReached.current = true
      if (phaseRef.current === 'waiting') finish()
    }, SOFT_STOP_MS)
    hardTimer.current = setTimeout(finish, HARD_STOP_MS)
    scheduleWait()
  }

  const tap = () => {
    if (phaseRef.current === 'waiting') {
      clearTimeout(waitTimer.current)
      setMessage(REACTION.tooEarly)
      if (softReached.current) finish()
      else scheduleWait()
    } else if (phaseRef.current === 'prompt') {
      times.current.push(performance.now() - promptAt.current)
      setMessage('')
      if (softReached.current) finish()
      else scheduleWait()
    }
  }

  const skip = () => {
    clearTimers()
    times.current = []
    setMedian(null)
    setMessage(REACTION.skipped)
    go('skipped')
    onResultRef.current?.(null)
  }

  const running = phase === 'waiting' || phase === 'prompt'
  const onMain = running ? tap : start
  const mainLabel = running ? REACTION.tap : phase === 'done' || phase === 'skipped' ? REACTION.again : REACTION.start

  return (
    <div className="dw-card-raised mt-4 p-3">
      <p className="text-base font-semibold">Reaction check</p>
      <p className="text-base text-ink-2">{REACTION.intro}</p>
      <div role="status" aria-live="polite" className="mt-2 min-h-11 text-xl font-semibold">
        {phase === 'prompt' ? REACTION.prompt : null}
        {phase === 'waiting' && !message ? <span className="text-base font-normal">{REACTION.waiting}</span> : null}
        {phase !== 'prompt' && message ? <span className="text-base">{message}</span> : null}
        {phase === 'done' && median !== null ? <span className="text-base">{`Median reaction time: ${median} ms`}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" onClick={onMain} className="dw-btn dw-btn-primary min-h-11 min-w-11">
          {mainLabel}
        </button>
        <button type="button" onClick={skip} className="dw-btn min-h-11 min-w-11">
          {REACTION.skip}
        </button>
      </div>
    </div>
  )
}