import { describe, expect, it } from 'vitest';
import { groupItems, sortItems } from './selectors';
import { emptySnapshot, type Project, type Section, type Snapshot } from '@/domain/types';
import { item } from '@/test/items';

const project = (id: string, child_order: number, extra: Partial<Project> = {}): Project => ({
  id, name: id, color: 'grey', parent_id: null, child_order,
  is_archived: false, is_deleted: false, is_favorite: false, workspace_id: null, ...extra,
});
const section = (id: string, project_id: string, section_order: number): Section => ({
  id, project_id, name: id, section_order, is_archived: false, is_deleted: false,
});

const snapshot: Snapshot = {
  ...emptySnapshot(),
  projects: {
    inbox: project('inbox', 0, { inbox_project: true }),
    home: project('home', 1),
    folder: project('folder', 2, { is_folder: true }),
    site: project('site', 1, { parent_id: 'folder' }),
    work: project('work', 3),
  },
  sections: {
    later: section('later', 'home', 2),
    first: section('first', 'home', 1),
    design: section('design', 'site', 1),
  },
};

const labels = {
  none: '', noProject: 'No project', noSection: 'No section', noEstimate: '', noLabel: '',
  priority: (p: number) => `P${p}`, day: () => '', scheduled: '', available: '',
};

/* The case reported: grouped by project and sorted by priority, the project
   holding a P1 went to the top. */
const tasks = [
  item({ id: 'w', project_id: 'work', priority: 4 }),
  item({ id: 's', project_id: 'site', section_id: 'design', priority: 1 }),
  item({ id: 'h1', project_id: 'home', section_id: 'later', priority: 2 }),
  item({ id: 'h2', project_id: 'home', section_id: 'first', priority: 3 }),
  item({ id: 'h3', project_id: 'home', priority: 1 }),
  item({ id: 'i', project_id: 'inbox', priority: 1 }),
];
const sorted = sortItems(tasks, 'priority', () => []);
const keys = (group: Parameters<typeof groupItems>[1]) =>
  groupItems(sorted, group, snapshot, labels).map((g) => g.key);

describe('groupItems', () => {
  it('lists projects in sidebar order whatever the sort', () => {
    expect(keys('project')).toEqual(['inbox', 'home', 'site', 'work']);
  });

  it('sorts the tasks inside each project', () => {
    const home = groupItems(sorted, 'project', snapshot, labels).find((g) => g.key === 'home')!;
    expect(home.items.map((task) => task.id)).toEqual(['h2', 'h1', 'h3']);
  });

  it('lists sections by project, then section order, with no section first', () => {
    expect(keys('section')).toEqual(['none', 'first', 'later', 'design']);
  });

  it('lists priorities from P1 to P4', () => {
    expect(keys('priority')).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('sortItems by priority (#98 follow-up)', () => {
  const due = (date: string) => ({ date, is_recurring: false, string: '', lang: 'en', timezone: null });

  it('breaks a tie between same-priority tasks by their date, soonest first', () => {
    const items = [
      item({ id: 'later', priority: 4, due: due('2026-10-05') }),
      item({ id: 'sooner', priority: 4, due: due('2026-10-01') }),
      item({ id: 'undated', priority: 4 }),
    ];
    expect(sortItems(items, 'priority', () => []).map((i) => i.id))
      .toEqual(['sooner', 'later', 'undated']);
  });

  it('still puts a higher priority first, whatever its date', () => {
    const items = [
      item({ id: 'p2-soon', priority: 3, due: due('2026-10-01') }),
      item({ id: 'p1-late', priority: 4, due: due('2026-10-20') }),
    ];
    expect(sortItems(items, 'priority', () => []).map((i) => i.id)).toEqual(['p1-late', 'p2-soon']);
  });
});
