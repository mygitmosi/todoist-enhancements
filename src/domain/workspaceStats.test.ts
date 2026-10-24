import { describe, expect, it } from 'vitest';
import { elapsed, weeklyCompletions } from './workspaceStats';

const now = new Date(2026, 9, 22, 12);
describe('elapsed', () => {
  it('names the two largest units', () => {
    expect(elapsed(new Date(2024, 3, 10), now, 'en', 'today')).toBe('2 years, 6 months');
    expect(elapsed(new Date(2026, 6, 10), now, 'en', 'today')).toBe('3 months, 12 days');
    expect(elapsed(new Date(2026, 9, 17), now, 'en', 'today')).toBe('5 days');
  });
  it('says today for a project opened today or in the future', () => {
    expect(elapsed(new Date(2026, 9, 22, 8), now, 'en', 'today')).toBe('today');
    expect(elapsed(new Date(2027, 0, 1), now, 'en', 'today')).toBe('today');
  });
});
describe('weeklyCompletions', () => {
  it('buckets by seven-day span, oldest first, and ignores older ones', () => {
    const result = weeklyCompletions([
      { project_id: 'a', completed_at: new Date(2026, 9, 22, 9).toISOString() },
      { project_id: 'a', completed_at: new Date(2026, 9, 15, 9).toISOString() },
      { project_id: 'a', completed_at: new Date(2026, 6, 1).toISOString() },
    ], now);
    expect(result.a).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
  });
});
