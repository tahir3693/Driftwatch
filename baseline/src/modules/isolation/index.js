import { defineModule } from '../../engine/adapter.js'
import rules from './rules.json'
export default defineModule({ name: 'isolation', domain: 'isolation', kind: 'rules', rules })
