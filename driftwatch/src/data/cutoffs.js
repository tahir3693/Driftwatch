import raw from './cutoffs.json'
import { validateCutoffs } from '../engine/validateCutoffs.js'

let cached = null

export function loadCutoffs() {
  if (cached === null) {
    cached = Object.freeze({ ...validateCutoffs(raw) })
  }
  return cached
}
