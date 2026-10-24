import { describe, expect, it } from 'vitest';
import { stepOf, withStep } from './steps';
import { decodeTarget, dropMutation, encodeTarget, placementFor } from './dnd';
import { groupItems } from '@/store/selectors';
import { emptySnapshot, type Item } from './types';

const task = { id: 'task', labels: ['work', 'step-in-progress', 'est-30', 'step-review'], project_id: 'project', section_id: 'section', parent_id: 'parent', checked: false, due: { date: '2026-10-22' } } as Item;
describe('steps independent of task completion and placement', () => {
  it('replaces only reserved labels, keeps user tags and is case insensitive', () => {
    expect(withStep([...task.labels, 'STEP-DONE'], 'todo')).toEqual(['work', 'est-30', 'step-review', 'step-todo']);
    expect(stepOf({ labels: ['STEP-IN-PROGRESS'] })).toBe('in-progress');
    expect(stepOf({ labels: [] })).toBe('todo');
  });
  it('a Done drop changes only labels, leaving parent, section, project, dates and checked alone', () => {
    expect(dropMutation(task, { kind: 'step', step: 'done' })).toEqual({ update: { labels: ['work', 'est-30', 'step-review', 'step-done'] } });
    expect(task.checked).toBe(false);
    expect(placementFor({ kind: 'step', step: 'in-progress' })).toEqual({ labels: ['step-in-progress'] });
  });
  it('keeps all three groups in workflow order, even when empty', () => {
    const labels = { none: '', noProject: '', noSection: '', noEstimate: '', noLabel: '', priority: () => '', day: () => '', scheduled: '', available: '', step: (step: string) => step };
    const groups = groupItems([task], 'step', emptySnapshot(), labels);
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([['todo', 0], ['in-progress', 1], ['done', 0]]);
  });
  it('round trips scoped drop targets and rejects unknown step values', () => {
    expect(decodeTarget(encodeTarget({ kind: 'step', step: 'done' }, 'board'))).toEqual({ kind: 'step', step: 'done' });
    expect(decodeTarget('step:unknown')).toBeNull();
  });
});
