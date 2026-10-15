import { describe, expect, it } from 'vitest';
import { parseRoute } from './useRoute';

describe('parseRoute label names (#196)', () => {
  it('reads a label with an emoji back from the percent-encoded address', () => {
    const hash = `#/label/${encodeURIComponent('🏠 Home')}`;
    expect(parseRoute(hash)).toEqual({ view: 'label', id: '🏠 Home', sectionId: undefined });
  });

  it('keeps a slash, a question mark and a percent sign in the name', () => {
    const name = 'a/b?c 100%';
    expect(parseRoute(`#/label/${encodeURIComponent(name)}`).id).toBe(name);
  });

  it('keeps a name that is not valid encoding as it is', () => {
    expect(parseRoute('#/label/100%').id).toBe('100%');
  });

  it('still reads a project id and its section', () => {
    expect(parseRoute('#/project/abc123?section=s1'))
      .toEqual({ view: 'project', id: 'abc123', sectionId: 's1' });
  });
});
