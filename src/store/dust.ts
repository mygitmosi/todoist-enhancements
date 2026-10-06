/** The tasks kept in Someday on purpose (#161): a ledger that lives on this device. */
import * as idb from '@/db/idb';
import { translate } from '@/i18n';
import { keptDay, pruneKept, type DustLedger } from '@/domain/views';
import type { DustSlice, Slice } from './types';

/** Where the ledger is kept in the device's own database. */
export const DUST_KEY = 'dust-kept';

/**
 * Nothing is written to Todoist for a task that is kept: no tag, no comment,
 * no field. The ledger is the task's id and the day it was kept, in IndexedDB,
 * so it is per device by design: on another device the task shows up again.
 * Signing out clears it with the rest of what the device holds. The demo keeps
 * it in memory only, like everything else about it.
 */
export const createDustSlice: Slice<DustSlice> = (set, get) => ({
  dustKept: {},
  keepInSomeday(id) {
    const before = get().dustKept;
    const write = (next: DustLedger) => {
      set({ dustKept: next });
      if (!get().demo) void idb.savePrefs(DUST_KEY, next);
    };
    write(pruneKept({ ...before, [id]: keptDay() }));
    get().toast(translate(get().prefs.locale, 'dust.kept'), () => write(before));
  },
});
