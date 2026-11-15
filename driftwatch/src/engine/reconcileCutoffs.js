/**
 * Compare a module's optional rules.urgency block with the shared cutoffs.
 * Pure: always returns the same shared cutoffs object; never logs.
 */
export function reconcileCutoffs(rules, cutoffs, moduleName) {
  const warnings = []
  const block = rules && rules.urgency
  if (block && typeof block === 'object') {
    const watchDiffers = block.watch_from !== cutoffs.watch_from
    const actDiffers = block.act_from !== cutoffs.act_from
    if (watchDiffers || actDiffers) {
      warnings.push(
        `Module "${moduleName}" urgency block (watch_from ${block.watch_from}, act_from ${block.act_from}) ` +
          `differs from shared cutoffs (watch_from ${cutoffs.watch_from}, act_from ${cutoffs.act_from}); ` +
          'the shared cutoffs are used.'
      )
    }
  }
  return { cutoffs, warnings }
}
