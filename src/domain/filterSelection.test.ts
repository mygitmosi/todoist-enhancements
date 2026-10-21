import { describe, expect, it } from 'vitest';
import { filterRoots } from './filterSelection';
import type { Item } from './types';
const parent = { id: 'parent', parent_id: null, checked: false, is_deleted: false } as Item;
const child = { ...parent, id: 'child', parent_id: 'parent' };

describe('saved filters with separate comma lists (#274)', () => {
  it('keeps a matching child in its own list when its parent matches a different list', () => {
    const snapshot = { parent, child };
    expect(filterRoots(['parent'], snapshot).map((item) => item.id)).toEqual(['parent']);
    expect(filterRoots(['child'], snapshot).map((item) => item.id)).toEqual(['child']);
    expect(filterRoots(['parent', 'child'], snapshot).map((item) => item.id)).toEqual(['parent']);
  });
  it('does not hide children under a deleted or completed parent, or duplicate matches', () => {
    expect(filterRoots(['parent', 'child', 'child', 'missing'], { parent: { ...parent, checked: true }, child })
      .map((item) => item.id)).toEqual(['child']);
  });
});
