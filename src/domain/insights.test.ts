import { describe, expect, it } from 'vitest';
import { completionBuckets, summariseInsights } from './insights';
import { rangeFor } from './periods';
import { emptySnapshot, type CompletedItem } from './types';

const done = (overrides: Partial<CompletedItem>): CompletedItem => ({
  id: overrides.id ?? 'c',
  user_id: 'me',
  project_id: 'inbox',
  section_id: null,
  content: 'Done',
  completed_at: '2026-10-05T10:00:00Z',
  ...overrides,
});

describe('completed estimated time (#151)', () => {
  it("counts a completed task's own duration like its tag, and est-* never as a tag", () => {
    const summary = summariseInsights([
      done({ id: 'tag', labels: ['est-20', 'home'] }),
      done({ id: 'duration', duration: { amount: 40, unit: 'minute' } }),
      done({ id: 'days', duration: { amount: 1, unit: 'day' } }),
      done({ id: 'bare' }),
    ], [], emptySnapshot(), new Date('2026-10-05T12:00:00Z'));

    expect(summary.completedMinutes).toBe(60);
    expect(summary.completedWithoutEstimate).toBe(2);
  });
});

describe('completions per bucket (#174)', () => {
  const at = (iso: string) => done({ completed_at: new Date(iso).toISOString() });

  it('reads a quarter by month with totals that add up, zero months included', () => {
    const range = rangeFor('quarter', 0, null, 1, new Date(2026, 9, 7));
    const items = [at('2026-10-02T09:00:00'), at('2026-10-30T20:00:00'), at('2026-12-31T23:30:00')];
    const months = completionBuckets(items, range, 'month');
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(months.map((m) => m.value)).toEqual([2, 0, 1]);
    expect(months.reduce((sum, m) => sum + m.value, 0)).toBe(items.length);
  });

  it('keeps hours out of it: the same items read by day add up to the same total', () => {
    const range = rangeFor('month', 0, null, 1, new Date(2026, 9, 7));
    const items = [at('2026-10-02T09:00:00'), at('2026-10-02T17:00:00'), at('2026-10-25T01:30:00')];
    const days = completionBuckets(items, range, 'day');
    expect(days).toHaveLength(31);
    expect(days.find((d) => d.key === '2026-10-02')?.value).toBe(2);
    expect(days.reduce((sum, d) => sum + d.value, 0)).toBe(3);
  });
});
