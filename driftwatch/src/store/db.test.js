import 'fake-indexeddb/auto'
import { describe, it, expect, afterEach } from 'vitest'
import Dexie from 'dexie'
import { db } from './db.js'

const openDbs = []
afterEach(async () => {
  for (const d of openDbs.splice(0)) {
    d.close()
    await Dexie.delete(d.name)
  }
  await db.checkins.clear()
})

describe('db schema', () => {
  it('upgrades a version 1 database to version 2 and keeps its Readings', async () => {
    const name = 'driftwatch-upgrade-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({ readings: '++id, [domain+indicator+timestamp], timestamp' })
    await v1.open()
    await v1.table('readings').add({ domain: 'nutrition', indicator: 'intake_pct_of_plan', timestamp: 5, value: 90 })
    v1.close()

    const v2 = new Dexie(name)
    openDbs.push(v2)
    v2.version(1).stores({ readings: '++id, [domain+indicator+timestamp], timestamp' })
    v2.version(2).stores({ checkins: '++id, &[dayKey+module], dayKey' })
    await v2.open()
    expect(await v2.table('readings').count()).toBe(1)
    expect((await v2.table('readings').toArray())[0].value).toBe(90)
    expect(v2.tables.map((t) => t.name).sort()).toEqual(['checkins', 'readings'])
  })

  it('declares both tables on the app database', async () => {
    await db.open()
    expect(db.tables.map((t) => t.name).sort()).toEqual(['checkins', 'readings'])
    expect(db.verno).toBe(2)
  })

  it('rejects a second record for the same day and module', async () => {
    await db.checkins.add({ dayKey: '2025-03-10', module: 'gravity', submittedAt: 1, readingIds: [] })
    await expect(db.checkins.add({ dayKey: '2025-03-10', module: 'gravity', submittedAt: 2, readingIds: [] })).rejects.toThrow()
    await db.checkins.add({ dayKey: '2025-03-10', module: 'nutrition', submittedAt: 2, readingIds: [] })
    expect(await db.checkins.count()).toBe(2)
  })
})