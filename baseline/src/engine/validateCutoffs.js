export class CutoffsError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CutoffsError'
  }
}

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)

// Throws CutoffsError when the cutoffs are missing, malformed or inconsistent.
// Returns the same object when valid.
export function validateCutoffs(cutoffs) {
  if (cutoffs === null || cutoffs === undefined || typeof cutoffs !== 'object' || Array.isArray(cutoffs)) {
    throw new CutoffsError('cutoffs are missing')
  }
  for (const key of ['watch_from', 'act_from']) {
    if (cutoffs[key] === undefined || cutoffs[key] === null) {
      throw new CutoffsError(`cutoffs.${key} is missing`)
    }
    if (!isFiniteNumber(cutoffs[key])) {
      throw new CutoffsError(`cutoffs.${key} must be a finite number`)
    }
  }
  if (cutoffs.watch_from >= cutoffs.act_from) {
    throw new CutoffsError('cutoffs.watch_from must be less than cutoffs.act_from')
  }
  if (typeof cutoffs.source !== 'string' || cutoffs.source === '') {
    throw new CutoffsError('cutoffs.source is missing')
  }
  return cutoffs
}
