import { describe, expect, it } from 'vitest';
import { tableColumns } from './table';
import { pageClass } from './pageLayout';
import { defaultViewPrefs } from './types';

describe('table columns', () => {
  const view = defaultViewPrefs('inbox');

  it('opens with the default columns, title first', () => {
    expect(tableColumns(view)).toEqual(['title', 'date', 'deadline', 'priority', 'estimate', 'labels']);
  });

  it('follows the order the user chose, and keeps the title first', () => {
    expect(tableColumns({ ...view, tableColumns: ['labels', 'project', 'title', 'date'] }))
      .toEqual(['title', 'labels', 'project', 'date']);
  });

  it('ignores a column listed twice or unknown to this version', () => {
    const odd = ['date', 'date', 'gone'] as unknown as Parameters<typeof tableColumns>[0]['tableColumns'];
    expect(tableColumns({ ...view, tableColumns: odd })).toEqual(['title', 'date']);
  });
});

describe('page layout', () => {
  const view = defaultViewPrefs('inbox');

  it('keeps a list to a reading width unless it asks for the whole page', () => {
    expect(pageClass({ ...view, mode: 'list' })).toBe('page narrow');
    expect(pageClass({ ...view, mode: 'list', fullWidth: true })).toBe('page');
  });

});
