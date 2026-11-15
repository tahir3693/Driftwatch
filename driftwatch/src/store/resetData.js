// Deletes the data saved on this device: every Reading and check-in in IndexedDB and the BMD and
// strength tracker's localStorage key. Settings and the app code are not touched.
import { db } from './db.js'
import { BMD_STORAGE_KEY } from '../modules/bmd-strength/bmdAdapter.js'

/** Resolves when both stores are cleared. Rejects if IndexedDB cannot be cleared. */
export async function resetStoredData(storage = globalThis.localStorage) {
  await db.transaction('rw', db.readings, db.checkins, async () => {
    await db.readings.clear()
    await db.checkins.clear()
  })
  try {
    storage?.removeItem(BMD_STORAGE_KEY)
  } catch {
    // Storage blocked: nothing saved there to remove.
  }
}
