import { defineModule } from '../../engine/adapter.js'
import rules from './rules.json'

export default defineModule({ name: 'nutrition', domain: 'nutrition', kind: 'rules', rules })
