import { afterEach, describe, expect, it } from 'vitest';
import { defaultConflictSettings, detectConflicts, detectIncomplete } from './conflicts';
import { setEstimateStorage, weekLabel } from './types';
import { due, item } from '@/test/items';

const noChildren = () => [];
const kinds = (items: Parameters<typeof detectConflicts>[0], childrenOf: Parameters<typeof detectConflicts>[1] = noChildren) =>
  detectConflicts(items, childrenOf).map((conflict) => conflict.kind);

describe('detectConflicts', () => {
  it('finds nothing wrong with an ordinary task', () => {
    expect(kinds([item({ labels: ['est-30'] })])).toEqual([]);
  });

  it('flags a "quick" task estimated at 40 minutes', () => {
    expect(kinds([item({ labels: ['quick', 'est-40'] })])).toEqual(['quick-too-long']);
  });

  it('flags a task both dated and labelled for the week', () => {
    expect(kinds([item({ due: due('2026-09-24'), labels: [weekLabel()] })]))
      .toEqual(['date-and-week']);
  });

  it('flags two estimates, recommending the first', () => {
    const [conflict] = detectConflicts([item({ labels: ['est-30', 'est-45'] })], noChildren);
    expect(conflict.kind).toBe('multiple-estimates');
    expect(conflict.options.find((option) => option.recommended)?.payload)
      .toEqual({ label: 'est-30' });
  });

  it('flags an estimate that cannot be read', () => {
    expect(kinds([item({ labels: ['est-soon'] })])).toEqual(['invalid-estimate']);
  });

  it('flags a parent estimated alongside only some estimated subtasks', () => {
    const parent = item({ id: 'parent', labels: ['est-60'] });
    const child = item({ id: 'child', parent_id: 'parent', labels: ['est-30'] });
    const bare = item({ id: 'bare', parent_id: 'parent' });
    const [conflict] = detectConflicts([parent], (id) => (id === 'parent' ? [child, bare] : []));
    expect(conflict.kind).toBe('parent-and-children-estimated');
    expect(conflict.messageValues).toEqual({ parent: 60, children: 30 });
  });

  it('raises nothing once every open subtask is estimated: their sum wins (#187)', () => {
    const parent = item({ id: 'parent', labels: ['est-60'] });
    const child = item({ id: 'child', parent_id: 'parent', labels: ['est-30'] });
    expect(kinds([parent], (id) => (id === 'parent' ? [child] : []))).toEqual([]);
  });

  it('leaves a kind alone once it is turned off', () => {
    const settings = { ...defaultConflictSettings(), quickTooLong: false };
    expect(detectConflicts([item({ labels: ['quick', 'est-40'] })], noChildren, settings))
      .toEqual([]);
  });
});

describe('detectIncomplete', () => {
  it('lists the tasks with no estimate', () => {
    const estimated = item({ id: 'estimated', labels: ['est-15'] });
    const bare = item({ id: 'bare' });
    expect(detectIncomplete([estimated, bare]).map((task) => task.id)).toEqual(['bare']);
  });

  it("counts Todoist's own duration as an estimate (#151)", () => {
    const timed = item({ id: 'timed', duration: { amount: 30, unit: 'minute' } });
    const days = item({ id: 'days', duration: { amount: 1, unit: 'day' } });
    expect(detectIncomplete([timed, days]).map((task) => task.id)).toEqual(['days']);
  });

  it('never reports a duration as a second estimate', () => {
    const both = item({ labels: ['est-30'], duration: { amount: 45, unit: 'minute' } });
    expect(detectConflicts([both], noChildren, defaultConflictSettings())).toEqual([]);
  });
});

afterEach(() => setEstimateStorage(null));
describe('estimate storage conflicts', () => {
  it('shows differing sources only when duration is selected, and warns about timed blocks', () => {
    const task = item({ labels: ['est-25'], duration: { amount: 60, unit: 'minute' }, due: due('2026-10-06T10:00:00') });
    expect(kinds([task])).toEqual([]);
    setEstimateStorage('duration');
    const conflicts = detectConflicts([task], noChildren);
    expect(conflicts[0].kind).toBe('estimate-mismatch');
    expect(conflicts[0].options[1].labelKey).toBe('estimates.keepTagTimed');
    expect(detectConflicts([task], noChildren, { ...defaultConflictSettings(), estimateMismatch: false })).toEqual([]);
    expect(kinds([item({ labels: ['est-60'], duration: { amount: 60, unit: 'minute' } })])).toEqual([]);
  });
});
