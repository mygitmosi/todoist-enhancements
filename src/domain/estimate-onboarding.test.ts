import { describe, expect, it } from 'vitest';
import { shouldAskEstimateStorage } from './onboarding';
const ready = { ready: true, settled: true, demo: false, quickAdd: false, onboarded: true, storage: null, busy: false, dismissed: false } as const;
describe('estimate choice after startup', () => {
  it('asks an existing account only after startup overlays have settled', () => {
    expect(shouldAskEstimateStorage(ready)).toBe(true);
    for (const patch of [{ ready: false }, { settled: false }, { onboarded: false }, { demo: true }, { quickAdd: true }, { busy: true }, { dismissed: true }, { storage: 'tag' as const }, { storage: 'duration' as const }]) {
      expect(shouldAskEstimateStorage({ ...ready, ...patch })).toBe(false);
    }
  });
});
