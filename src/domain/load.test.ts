import { describe, expect, it } from 'vitest';
import { loadTone, summariseLoad } from './load';
import { item } from '@/test/items';

describe('the tone of the header duration (#173)', () => {
  it('is neutral below 90%, amber from 90 to 99, red from 100', () => {
    expect(loadTone(0)).toBe('neutral');
    expect(loadTone(89)).toBe('neutral');
    expect(loadTone(90)).toBe('warn');
    expect(loadTone(99)).toBe('warn');
    expect(loadTone(100)).toBe('over');
    expect(loadTone(240)).toBe('over');
  });

  it('is neutral where there is no capacity to measure against', () => {
    expect(loadTone(null)).toBe('neutral');
  });

  it('reads the percentage the summary computes', () => {
    const tasks = [item({ id: 'a', labels: ['est-90'] }), item({ id: 'b' })];
    const none = () => [];
    // 90 of 100 minutes is 90%: amber. One task has no estimate and says so.
    const summary = summariseLoad(tasks, none, 100);
    expect(summary).toMatchObject({ taskCount: 2, estimatedMinutes: 90, unestimatedCount: 1, percentage: 90 });
    expect(loadTone(summary.percentage)).toBe('warn');
    expect(summariseLoad(tasks, none, null).percentage).toBeNull();
  });
});
