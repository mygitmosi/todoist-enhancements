import { describe, expect, it } from 'vitest';
import { fitBucketOf, fitsIn, suggestDuration } from './fits';
import { due, item } from '@/test/items';
import type { Item } from './types';

/* A Wednesday at noon. */
const NOW = new Date(2026, 9, 7, 12, 0, 0);

const none = () => [] as Item[];
const ids = (list: Item[]) => list.map((task) => task.id);
const allIds = (result: ReturnType<typeof fitsIn>) => result.buckets.flatMap((b) => ids(b.items));

describe('what fits in the time you have', () => {
  it('lists a task of exactly the duration, and not a longer one', () => {
    const tasks = [
      item({ id: '10', labels: ['est-10'] }),
      item({ id: '15', labels: ['est-15'] }),
      item({ id: '20', labels: ['est-20'] }),
    ];
    expect(allIds(fitsIn(tasks, 15, none, NOW)).sort()).toEqual(['10', '15']);
    expect(allIds(fitsIn(tasks, 14, none, NOW))).toEqual(['10']);
  });

  it('uses the sum of its subtasks for a parent with no estimate of its own', () => {
    const parent = item({ id: 'parent' });
    const children = [
      item({ id: 'a', parent_id: 'parent', labels: ['est-5'] }),
      item({ id: 'b', parent_id: 'parent', labels: ['est-5'] }),
    ];
    const childrenOf = (id: string) => (id === 'parent' ? children : []);
    const all = [parent, ...children];
    expect(allIds(fitsIn(all, 10, childrenOf, NOW))).toEqual(['parent']);
    expect(allIds(fitsIn(all, 5, childrenOf, NOW))).toEqual([]);
  });

  it("uses a parent's own estimate over its subtasks", () => {
    const parent = item({ id: 'parent', labels: ['est-30'] });
    const children = [item({ id: 'a', parent_id: 'parent', labels: ['est-5'] })];
    const childrenOf = (id: string) => (id === 'parent' ? children : []);
    expect(allIds(fitsIn([parent, ...children], 15, childrenOf, NOW))).toEqual([]);
    expect(allIds(fitsIn([parent, ...children], 30, childrenOf, NOW))).toEqual(['parent']);
  });

  it('never lists a subtask on its own', () => {
    const tasks = [item({ id: 'child', parent_id: 'parent', labels: ['est-5'] })];
    expect(allIds(fitsIn(tasks, 15, none, NOW))).toEqual([]);
  });

  it('counts a task tagged quick with no estimate as five minutes', () => {
    const tasks = [item({ id: 'quick', labels: ['quick'] })];
    expect(allIds(fitsIn(tasks, 5, none, NOW))).toEqual(['quick']);
    expect(fitsIn(tasks, 5, none, NOW).minutes).toBe(5);
    expect(allIds(fitsIn(tasks, 4, none, NOW))).toEqual([]);
  });

  it('trusts the estimate over the quick tag', () => {
    const tasks = [item({ id: 'liar', labels: ['quick', 'est-40'] })];
    expect(allIds(fitsIn(tasks, 15, none, NOW))).toEqual([]);
    expect(fitsIn(tasks, 15, none, NOW).setAside).toEqual([]);
  });

  it('sets aside a task with no estimate and no tag, and says which', () => {
    const tasks = [item({ id: 'unknown' }), item({ id: 'fits', labels: ['est-5'] })];
    const result = fitsIn(tasks, 15, none, NOW);
    expect(ids(result.setAside)).toEqual(['unknown']);
    expect(allIds(result)).toEqual(['fits']);
  });

  it('does not count among the set aside a task its date rules out', () => {
    const tasks = [item({ id: 'later', due: due('2026-11-01') })];
    expect(fitsIn(tasks, 15, none, NOW).setAside).toEqual([]);
  });

  it('puts every task its date allows in its bucket, in the panel order', () => {
    const est = ['est-5'];
    const tasks = [
      item({ id: 'nodate', labels: est }),
      item({ id: 'week', labels: [...est, 'week'] }),
      item({ id: 'tomorrow', labels: est, due: due('2026-10-08') }),
      item({ id: 'today-timed', labels: est, due: due('2026-10-07T17:00:00') }),
      item({ id: 'today', labels: est, due: due('2026-10-07') }),
      item({ id: 'overdue', labels: est, due: due('2026-10-02') }),
    ];
    const result = fitsIn(tasks, 15, none, NOW);
    expect(result.buckets.map((b) => b.key)).toEqual(['overdue', 'today', 'tomorrow', 'week', 'nodate']);
    expect(result.count).toBe(6);
  });

  it.each([
    ['next week', due('2026-10-14')],
    ['in two days', due('2026-10-09')],
    ['next month', due('2026-11-01')],
  ])('leaves out a task dated %s', (_name, date) => {
    expect(allIds(fitsIn([item({ id: 'a', labels: ['est-5'], due: date })], 60, none, NOW))).toEqual([]);
  });

  it('files a task that was timed earlier today under overdue, as the rest of the app does', () => {
    expect(fitBucketOf(item({ due: due('2026-10-07T09:00:00') }), NOW)).toBe('overdue');
  });

  it('leaves out a completed task', () => {
    expect(allIds(fitsIn([item({ id: 'a', labels: ['est-5'], checked: true })], 15, none, NOW))).toEqual([]);
  });

  it('adds the subtotals up to the summary', () => {
    const tasks = [
      item({ id: 'a', labels: ['est-5'], due: due('2026-10-07') }),
      item({ id: 'b', labels: ['est-10'], due: due('2026-10-07') }),
      item({ id: 'c', labels: ['est-15'] }),
      item({ id: 'd', labels: ['quick'] }),
    ];
    const result = fitsIn(tasks, 15, none, NOW);
    expect(result.buckets.map((b) => [b.key, b.minutes])).toEqual([['today', 15], ['nodate', 20]]);
    expect(result.minutes).toBe(35);
    expect(result.count).toBe(4);
  });

  it('reads the next duration that would find something', () => {
    const tasks = [item({ id: 'a', labels: ['est-20'] }), item({ id: 'b', labels: ['est-90'] })];
    const result = fitsIn(tasks, 15, none, NOW);
    expect(result.count).toBe(0);
    expect(result.next).toBe(20);
    expect(suggestDuration(result.next)).toBe(30);
    expect(suggestDuration(90)).toBe(90);
    expect(suggestDuration(null)).toBeNull();
  });

  it('orders the late and today buckets by their moment', () => {
    const tasks = [
      item({ id: 'late', labels: ['est-5'], due: due('2026-10-07T18:00:00') }),
      item({ id: 'early', labels: ['est-5'], due: due('2026-10-07T13:00:00') }),
      item({ id: 'untimed', labels: ['est-5'], due: due('2026-10-07') }),
    ];
    const today = fitsIn(tasks, 15, none, NOW).buckets.find((b) => b.key === 'today')!;
    expect(ids(today.items)).toEqual(['untimed', 'early', 'late']);
  });
});
