import { describe, expect, it } from 'vitest';
import { msUntilNextDay } from './dates';

describe('msUntilNextDay (#146)', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 8, 28, 23, 59, 30))).toBe(30_000);
    expect(msUntilNextDay(new Date(2026, 8, 28, 0, 0, 0))).toBe(24 * 3600_000);
  });

  it('always lands on a midnight, whatever the hour it is asked at', () => {
    for (const hour of [0, 1, 6, 12, 18, 23]) {
      const now = new Date(2026, 9, 25, hour, 15);
      const then = new Date(now.getTime() + msUntilNextDay(now));
      expect([then.getHours(), then.getMinutes(), then.getSeconds()]).toEqual([0, 0, 0]);
      expect(then.getDate()).toBe(26);
    }
  });
});
