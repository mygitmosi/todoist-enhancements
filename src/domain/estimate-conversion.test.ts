import { describe, expect, it } from 'vitest';
import { item } from '@/test/items';
import { planEstimateConversion } from './estimate-conversion';

const timed = { date: '2026-10-06T10:00:00', timezone: null, lang: 'en', string: 'today', is_recurring: false };
const duration = (amount: number) => ({ amount, unit: 'minute' as const });

describe('open estimate conversion (#151)', () => {
  it('previews subtasks and timed tasks, skips unsafe data and never includes completed tasks', () => {
    const tasks = [
      item({ id: 'plain', labels: ['work', 'est-20'] }),
      item({ id: 'child', parent_id: 'plain', labels: ['est-10'], due: timed }),
      item({ id: 'equal', labels: ['est-15'], duration: duration(15) }),
      item({ id: 'different', labels: ['est-20'], duration: duration(60) }),
      item({ id: 'days', labels: ['est-20'], duration: { amount: 2, unit: 'day' } }),
      item({ id: 'invalid', labels: ['est-bad'] }),
      item({ id: 'multiple', labels: ['est-10', 'est-20'] }),
      item({ id: 'done', checked: true, labels: ['est-10'] }),
    ];
    const plan = planEstimateConversion(tasks, 'duration');
    expect(plan.changes.map((c) => c.item.id)).toEqual(['plain', 'child', 'equal']);
    expect(plan.timed).toBe(1);
    expect(plan.skipped.map((s) => [s.item.id, s.reason])).toEqual([
      ['different', 'different'], ['days', 'days'], ['invalid', 'invalid'], ['multiple', 'invalid'],
    ]);
    expect(plan.changes[0].patch).toEqual({ labels: ['work'], duration: duration(20) });
    const after = tasks.map((t) => ({ ...t, ...plan.changes.find((c) => c.item.id === t.id)?.patch }));
    expect(planEstimateConversion(after, 'duration').changes).toEqual([]);
  });
  it('inverse conversion removes untimed durations and preserves timed calendar blocks', () => {
    const tasks = [item({ id: 'plain', duration: duration(20) }), item({ id: 'timed', due: timed, duration: duration(30) })];
    const plan = planEstimateConversion(tasks, 'tag');
    expect(plan.changes[0].patch).toEqual({ labels: ['est-20'], duration: null });
    expect(plan.changes[1].patch).toEqual({ labels: ['est-30'] });
    const after = plan.changes.map(({ item: t, patch }) => ({ ...t, ...patch }));
    expect(planEstimateConversion(after, 'tag').changes).toEqual([]);
    expect(after[1].due).toEqual(timed);
  });
  it('inverse lists day-unit durations and differing tags as skipped', () => {
    const plan = planEstimateConversion([
      item({ duration: { amount: 1, unit: 'day' } }),
      item({ labels: ['est-5'], duration: duration(10) }),
    ], 'tag');
    expect(plan.skipped.map((s) => s.reason)).toEqual(['days', 'different']);
    expect(plan.changes).toEqual([]);
  });
});
