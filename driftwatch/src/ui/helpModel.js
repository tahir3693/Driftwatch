import { NOT_AVAILABLE } from './wording.js'

const text = (v) => (typeof v === 'string' && v.length > 0 ? v : NOT_AVAILABLE)

/** { label, sections } with the four headings in a fixed order. Missing or empty text gives "Not available". */
export function helpSections(rule) {
  return {
    label: typeof rule?.label === 'string' && rule.label ? rule.label : null,
    sections: [
      { heading: 'How to measure', text: text(rule?.howToMeasure) },
      { heading: 'Why it matters', text: text(rule?.whyItMatters) },
      { heading: 'What to do', text: text(rule?.action) },
      { heading: 'Source', text: text(rule?.source) },
    ],
  }
}
