import Dexie from 'dexie'

export const db = new Dexie('driftwatch')

db.version(1).stores({
  readings: '++id, [domain+indicator+timestamp], timestamp',
})

// Version 2 adds check-in records: one per module per local day (unique compound index).
// Dexie carries the unchanged `readings` table forward.
db.version(2).stores({
  checkins: '++id, &[dayKey+module], dayKey',
})