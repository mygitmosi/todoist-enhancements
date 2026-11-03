import { describe, expect, it } from 'vitest';
import {
  MAIN_VIEW, activeTab, cloneSettings, isViewKey, moveTab, neighbourAfterDelete, newViewId, projectIdOfKey,
  readProjectViews, tabsOf, uniqueName, viewKeyOf, withoutTab, type ProjectViewTab,
} from './projectViews';
import { defaultViewPrefs } from './types';

const tabs: ProjectViewTab[] = [
  { id: MAIN_VIEW, name: 'All tasks' }, { id: 'a1', name: 'Focus' }, { id: 'b2', name: 'Board' },
];

describe('keys', () => {
  it('keeps the project key for the first view', () => {
    expect(viewKeyOf('p1', MAIN_VIEW)).toBe('project:p1');
    expect(viewKeyOf('p1', 'a1')).toBe('project:p1~a1');
  });
  it('finds the project from any of its keys', () => {
    expect(projectIdOfKey('project:p1')).toBe('p1');
    expect(projectIdOfKey('project:p1~a1')).toBe('p1');
    expect(projectIdOfKey('label:x')).toBeUndefined();
    expect(isViewKey('project:p1~a1')).toBe(true);
    expect(isViewKey('project:p1')).toBe(false);
  });
});

describe('tabs', () => {
  it('starts a project with one view', () => {
    expect(tabsOf(undefined, 'All tasks')).toEqual([{ id: MAIN_VIEW, name: 'All tasks' }]);
    expect(tabsOf({ tabs: [] }, 'All tasks')).toHaveLength(1);
    expect(tabsOf({ tabs }, 'x')).toBe(tabs);
  });
  it('falls back to the first view when the active one is gone', () => {
    expect(activeTab(tabs, 'b2').id).toBe('b2');
    expect(activeTab(tabs, 'zzz').id).toBe(MAIN_VIEW);
    expect(activeTab(tabs, undefined).id).toBe(MAIN_VIEW);
  });
  it('never gives two views the same name', () => {
    expect(uniqueName(tabs, 'focus', 'View')).toBe('focus 2');
    expect(uniqueName(tabs, '  ', 'View')).toBe('View');
    expect(uniqueName(tabs, 'Focus', 'View', 'a1')).toBe('Focus');
    expect(uniqueName(tabs, 'x'.repeat(90), 'View')).toHaveLength(60);
  });
  it('makes ids that are free', () => {
    const ids = new Set(tabs.map((t) => t.id));
    expect(ids.has(newViewId(tabs))).toBe(false);
    const draws = [0, 0.5];
    expect(newViewId([{ id: '000000', name: 'x' }], () => draws.shift() ?? 0.9)).not.toBe('000000');
  });
  it('moves and deletes', () => {
    expect(moveTab(tabs, 'b2', 0).map((t) => t.id)).toEqual(['b2', MAIN_VIEW, 'a1']);
    expect(moveTab(tabs, 'b2', 99).map((t) => t.id)).toEqual([MAIN_VIEW, 'a1', 'b2']);
    expect(moveTab(tabs, 'nope', 0)).toBe(tabs);
    expect(withoutTab(tabs, 'a1').map((t) => t.id)).toEqual([MAIN_VIEW, 'b2']);
    expect(withoutTab([tabs[0]], MAIN_VIEW)).toHaveLength(1);
    expect(neighbourAfterDelete(tabs, 'b2')).toBe('a1');
    expect(neighbourAfterDelete(tabs, MAIN_VIEW)).toBe('a1');
  });
});

describe('settings', () => {
  it('copies filters so two views never share them', () => {
    const view = defaultViewPrefs('project:p1');
    view.filters.priorities = [1];
    const copy = cloneSettings(view);
    copy.filters.priorities.push(2);
    expect(view.filters.priorities).toEqual([1]);
  });
  it('reads views defensively', () => {
    expect(readProjectViews(null)).toEqual({});
    expect(readProjectViews({ p: { tabs: [{ id: 'a1', name: 'A' }, { id: 'a1', name: 'dup' }, { id: 'BAD ID', name: 'x' }, { id: 5, name: 'x' }] }, q: { tabs: 'x' }, r: { tabs: [] } }))
      .toEqual({ p: { tabs: [{ id: 'a1', name: 'A' }] } });
  });
});
