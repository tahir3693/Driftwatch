// Pure validator for a module's rules data. Throws RulesError on the first problem.

export class RulesError extends Error {
  constructor(moduleName, indicator, key, message) {
    super(message)
    this.name = 'RulesError'
    this.moduleName = moduleName
    this.indicator = indicator
    this.key = key
    this.message = message
  }
}

const FAMILIES = ['z_', 'abs_z_', 'value_']
const BAND_NAMES = ['normal', 'watch', 'act']
const TEXT_FIELDS = ['label', 'unit', 'why', 'action', 'howToMeasure', 'whyItMatters', 'source']
const DIRECTIONS = ['low', 'high', 'both']
const PATTERN_TEXT = ['why', 'action', 'source']

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v) => typeof v === 'string' && v.trim() !== ''

function familyOf(key) {
  for (const f of FAMILIES) {
    if (key === `${f}min` || key === `${f}max`) return f
  }
  return null
}

function checkBands(bands, bandsKey, moduleName, indicator, allowedFamily) {
  const fail = (key, message) => {
    throw new RulesError(moduleName, indicator, key, message)
  }
  if (!isObject(bands)) fail(bandsKey, `Indicator "${indicator}" needs a "${bandsKey}" object.`)
  for (const name of BAND_NAMES) {
    if (name === 'act' && bands.act === null) continue // no Act limit; Act is reached through patterns or codes
    if (!isObject(bands[name])) {
      fail(name, `Indicator "${indicator}" is missing the "${name}" band in "${bandsKey}".`)
    }
  }
  for (const name of Object.keys(bands)) {
    if (!BAND_NAMES.includes(name)) {
      fail(name, `Indicator "${indicator}" has unknown band "${name}" in "${bandsKey}".`)
    }
  }
  let family = null
  for (const name of BAND_NAMES) {
    if (name === 'act' && bands.act === null) continue
    const keys = Object.keys(bands[name])
    if (keys.length === 0) {
      fail(name, `Indicator "${indicator}" band "${name}" in "${bandsKey}" has no limits.`)
    }
    for (const key of keys) {
      const f = familyOf(key)
      if (f === null) {
        fail(key, `Indicator "${indicator}" band "${name}" has unknown band key "${key}".`)
      }
      if (allowedFamily && f !== allowedFamily) {
        fail(key, `Indicator "${indicator}" ${bandsKey} must use the "${allowedFamily}" key family, found "${key}".`)
      }
      if (family === null) family = f
      if (f !== family) {
        fail(key, `Indicator "${indicator}" mixes band key families ("${family}" and "${f}") in "${bandsKey}".`)
      }
      if (typeof bands[name][key] !== 'number' || !Number.isFinite(bands[name][key])) {
        fail(key, `Indicator "${indicator}" band "${name}" key "${key}" must be a finite number.`)
      }
    }
  }
}

export function validateRules(rules, moduleName) {
  if (!isObject(rules)) {
    throw new RulesError(moduleName, null, 'rules', `Rules for module "${moduleName}" must be an object.`)
  }
  if (rules.module !== moduleName) {
    throw new RulesError(
      moduleName,
      null,
      'module',
      `Rules "module" is ${JSON.stringify(rules.module)} but the module is named "${moduleName}".`,
    )
  }
  if (!isObject(rules.indicators)) {
    throw new RulesError(moduleName, null, 'indicators', `Module "${moduleName}" needs an "indicators" object.`)
  }

  for (const [indicator, rule] of Object.entries(rules.indicators)) {
    if (!isObject(rule)) {
      throw new RulesError(moduleName, indicator, 'indicator', `Indicator "${indicator}" must be an object.`)
    }
    for (const key of TEXT_FIELDS) {
      if (!isText(rule[key])) {
        throw new RulesError(moduleName, indicator, key, `Indicator "${indicator}" needs a non-empty string "${key}".`)
      }
    }
    if (!DIRECTIONS.includes(rule.bad_direction)) {
      throw new RulesError(
        moduleName,
        indicator,
        'bad_direction',
        `Indicator "${indicator}" "bad_direction" must be low, high or both.`,
      )
    }
    checkBands(rule.bands, 'bands', moduleName, indicator, null)
    if (rule.fallback_bands !== undefined) {
      checkBands(rule.fallback_bands, 'fallback_bands', moduleName, indicator, 'value_')
    }
  }

  if (rules.patterns !== undefined) {
    if (!isObject(rules.patterns)) {
      throw new RulesError(moduleName, null, 'patterns', `Module "${moduleName}" "patterns" must be an object.`)
    }
    for (const [name, p] of Object.entries(rules.patterns)) {
      const fail = (key, message) => {
        throw new RulesError(moduleName, name, key, message)
      }
      if (!isObject(p)) fail('pattern', `Pattern "${name}" must be an object.`)
      if (!Array.isArray(p.needs) || p.needs.length === 0) {
        fail('needs', `Pattern "${name}" needs a non-empty "needs" array.`)
      }
      for (const need of p.needs) {
        if (typeof need !== 'string' || !Object.hasOwn(rules.indicators, need)) {
          fail('needs', `Pattern "${name}" needs "${need}", which is not an indicator.`)
        }
      }
      for (const key of ['min_in_watch', 'for_days']) {
        if (!Number.isInteger(p[key]) || p[key] < 1) {
          fail(key, `Pattern "${name}" needs "${key}" as a whole number of at least 1.`)
        }
      }
      if (p.min_in_watch > p.needs.length) {
        fail('min_in_watch', `Pattern "${name}" "min_in_watch" is larger than the number of "needs".`)
      }
      if (p.result !== 'watch' && p.result !== 'act') {
        fail('result', `Pattern "${name}" "result" must be watch or act.`)
      }
      if (typeof p.escalate !== 'boolean') {
        fail('escalate', `Pattern "${name}" "escalate" must be true or false.`)
      }
      for (const key of PATTERN_TEXT) {
        if (!isText(p[key])) fail(key, `Pattern "${name}" needs a non-empty string "${key}".`)
      }
    }
  }
  return true
}
