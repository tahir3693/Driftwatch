import { DOMAINS } from '../data/domains.js'

const isPositiveInt = (n) => Number.isInteger(n) && n > 0
const isText = (s) => typeof s === 'string' && s.trim() !== ''

/** Returns the config when valid. Throws TypeError otherwise. */
export function validateReportConfig(config) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('Report config must be an object')
  }
  for (const key of ['windowDays', 'maxActiveAlertsPerModule', 'maxLastReadings']) {
    if (!isPositiveInt(config[key])) throw new TypeError(`Report config ${key} must be a positive integer`)
  }
  const labels = config.moduleLabels
  if (labels === null || typeof labels !== 'object' || Array.isArray(labels)) {
    throw new TypeError('Report config moduleLabels must be an object')
  }
  for (const domain of DOMAINS) {
    if (!isText(labels[domain])) throw new TypeError(`Report config moduleLabels.${domain} must be a non-empty string`)
  }
  if (!isText(config.source)) throw new TypeError('Report config source must be a non-empty string')
  return config
}
