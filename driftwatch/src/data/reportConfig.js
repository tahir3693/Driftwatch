// Ground report limits (window and caps), bundled as JSON so it works offline.
import raw from './reportConfig.json'
import { validateReportConfig } from '../report/validateReportConfig.js'

let cached = null

export function loadReportConfig() {
  if (cached === null) {
    const config = validateReportConfig(raw)
    cached = Object.freeze({ ...config, moduleLabels: Object.freeze({ ...config.moduleLabels }) })
  }
  return cached
}
