// One place for status colours, icon shapes and labels. Hex colours appear only in this file.
// The values match the theme variables in index.css (--normal, --watch, --act, --bg, --text).
export const STATUS_STYLE = Object.freeze({
  normal: { label: 'Normal', color: '#34D399', icon: 'circle', classes: 'border-normal text-normal' },
  watch: { label: 'Watch', color: '#FBBF24', icon: 'triangle', classes: 'border-watch text-watch' },
  act: { label: 'Act', color: '#F87171', icon: 'square', classes: 'border-act text-act' },
  nodata: { label: 'No data', color: '#A9B7CF', icon: 'dash', classes: 'border-line-strong text-ink-2' },
})
export const SURFACE = Object.freeze({ background: '#0B1220', text: '#E8EEF8' })
// Chart.js draws on a canvas, which cannot read CSS variables, so the chart colours are here as well.
export const CHART = Object.freeze({
  text: '#A9B7CF',
  grid: '#2A3A57',
  band: 'rgba(169, 183, 207, 0.22)',
})
/** 'normal' -> 'Normal'. null, undefined or an unknown value -> 'No data'. */
export function statusLabel(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_STYLE, status) ? STATUS_STYLE[status].label : STATUS_STYLE.nodata.label
}
/** Style for a status; null, undefined or an unknown value gives the no-data style. */
export function styleFor(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_STYLE, status) ? STATUS_STYLE[status] : STATUS_STYLE.nodata
}
