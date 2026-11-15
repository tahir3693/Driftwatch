// Glue between the app and the BMD and strength tracker page it embeds in an iframe
// (public/bmd-strength/index.html, same origin). It does three things, all from outside the page,
// so the tracker's own scripts are not changed:
// 1. marks the page as embedded (class "dw-embedded" on <html>), so its stylesheet can hide
//    the parts that the app already shows (the simulated-data note and the back link);
// 2. sizes the iframe to the page's content height, so there is only one scrollbar;
// 3. tells the page which part of it is visible in the app window (CSS variables
//    --dw-view-top, --dw-view-bottom and --dw-view-height), so its dialog and toast, which are
//    fixed to the iframe, appear where the user is looking and not in the middle of a tall frame.
const EMBEDDED_CLASS = 'dw-embedded'
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/** Height of the page content in px. The page has no fixed height, so this does not depend on the iframe. */
export function contentHeight(doc) {
  return Math.ceil(doc.documentElement.getBoundingClientRect().height)
}

/**
 * Start syncing one iframe. Call again after every load event. Returns a function that stops it.
 * Does nothing (and returns a no-op) when the page cannot be read.
 */
export function attachFrame(iframe) {
  let doc = null
  let win = null
  try {
    doc = iframe.contentDocument
    win = iframe.contentWindow
  } catch {
    return () => {}
  }
  const root = doc?.documentElement
  if (!root || !win) return () => {}
  root.classList.add(EMBEDDED_CLASS)

  let applied = -1
  let pending = 0
  let view = { top: 0, bottom: 0 }

  const measure = () => {
    pending = 0
    const h = contentHeight(doc)
    if (h > 0 && h !== applied) {
      applied = h
      iframe.style.height = `${h}px`
    }
    const height = Math.max(applied, 0)
    const rect = iframe.getBoundingClientRect()
    const top = clamp(-rect.top, 0, height)
    const bottom = clamp(window.innerHeight - rect.top, 0, height)
    // When the frame is off screen, keep the last visible range.
    if (bottom > top) view = { top, bottom }
    root.style.setProperty('--dw-view-top', `${Math.round(view.top)}px`)
    root.style.setProperty('--dw-view-bottom', `${Math.round(view.bottom)}px`)
    root.style.setProperty('--dw-view-height', `${Math.round(view.bottom - view.top)}px`)
  }
  const schedule = () => {
    if (pending) return
    pending = window.requestAnimationFrame ? window.requestAnimationFrame(measure) : window.setTimeout(measure, 16)
  }

  measure()
  const Observer = window.ResizeObserver ?? win.ResizeObserver
  let resize = null
  let mutation = null
  if (Observer) {
    resize = new Observer(schedule)
    resize.observe(root)
    if (doc.body) resize.observe(doc.body)
  } else if (win.MutationObserver && doc.body) {
    // No ResizeObserver: watch for content changes instead.
    mutation = new win.MutationObserver(schedule)
    mutation.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true })
  }
  win.addEventListener('resize', schedule)
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', schedule, { passive: true })

  return () => {
    resize?.disconnect()
    mutation?.disconnect()
    try {
      win.removeEventListener('resize', schedule)
    } catch {
      // The frame is already gone.
    }
    window.removeEventListener('resize', schedule)
    window.removeEventListener('scroll', schedule)
    if (pending) {
      if (window.cancelAnimationFrame) window.cancelAnimationFrame(pending)
      window.clearTimeout(pending)
    }
    pending = 0
  }
}
