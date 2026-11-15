import { defineModule } from '../../engine/adapter.js'
import rules from './rules.json'

export default defineModule({ name: 'environment', domain: 'environment', kind: 'rules', rules })
