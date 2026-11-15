// The five module descriptors the dashboard runs. The BMD and strength tracker is a sub-module of
// gravity (it feeds gravity's run function), so it is not listed here.
import radiation from '../modules/radiation/index.js'
import isolation from '../modules/isolation/index.js'
import gravity from '../modules/gravity/index.js'
import environment from '../modules/environment/index.js'
import nutrition from '../modules/nutrition/index.js'

export function getModuleDescriptors() {
  return [radiation, isolation, gravity, environment, nutrition]
}
