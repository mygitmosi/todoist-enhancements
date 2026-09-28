import { describe, expect, it } from 'vitest';
import { parseShorthand } from './shorthand';
import { emptySnapshot, type Snapshot } from './types';

const snapshot: Snapshot = emptySnapshot();

describe('a link is marked, not read (#101 follow-up)', () => {
  it('marks a bare domain as a link, and keeps it in the saved title', () => {
    const parsed = parseShorthand('Voir free.fr pour le tarif', snapshot, false);
    expect(parsed.content).toBe('Voir free.fr pour le tarif');
    const link = parsed.ranges.find((r) => r.kind === 'link');
    expect(link).toBeDefined();
    expect('free.fr pour le tarif'.slice(0)).toContain('free.fr');
    expect(parsed.content.slice(link!.start, link!.end)).toBe('free.fr');
  });

  it('marks a full address and a Markdown link the same way, both kept', () => {
    const parsed = parseShorthand('See https://example.com and [docs](https://example.com/d)', snapshot, false);
    const kinds = parsed.ranges.filter((r) => r.kind === 'link');
    expect(kinds).toHaveLength(2);
    expect(parsed.content).toBe('See https://example.com and [docs](https://example.com/d)');
  });

  it('does not mark an abbreviation or a decimal as a link', () => {
    const parsed = parseShorthand('e.g. verse 3.5 says', snapshot, false);
    expect(parsed.ranges.some((r) => r.kind === 'link')).toBe(false);
  });
});
