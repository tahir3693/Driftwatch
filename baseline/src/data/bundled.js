// Everything the engine needs at run time is bundled into the app so the service worker
// can precache it. Nothing here is fetched over the network.
// Eager globs pull each rules file, module wrapper (including the Radiation engine and its
// simulate function) and the shared scenario into the build, before any screen imports them.
export const bundledRules = import.meta.glob('../modules/*/rules.json', { eager: true, import: 'default' })
export const bundledModules = import.meta.glob('../modules/*/index.js', { eager: true })
export const bundledScenario = import.meta.glob('../sim/*.js', { eager: true })

export const bundledSummary = () => ({
  rulesFiles: Object.keys(bundledRules).length,
  moduleFiles: Object.keys(bundledModules).length,
  scenarioFiles: Object.keys(bundledScenario).length,
})
