import { describe, expect, it } from 'vitest';
import { summariseInsights } from './insights';
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
