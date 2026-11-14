import Dexie from 'dexie'

export const db = new Dexie('driftwatch')

db.version(1).stores({
  readings: '++id, [domain+indicator+timestamp], timestamp',
})
