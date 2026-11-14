import { defineModule } from '../../engine/adapter.js'
import rules from './rules.json'

export default defineModule({ name: 'gravity', domain: 'gravity', kind: 'rules', rules })
