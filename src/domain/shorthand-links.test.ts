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

describe('a link is content, never an instruction (#144)', () => {
  it('does not read /p1 in an address as a priority', () => {
    const parsed = parseShorthand('Read https://example.com/p1', snapshot, true);
    expect(parsed.priority).toBeNull();
    expect(parsed.content).toBe('Read https://example.com/p1');
  });

  it('does not read /daily in an address as a repeat rule', () => {
    const parsed = parseShorthand('Read https://example.com/daily', snapshot, true);
    expect(parsed.recurrence).toBeNull();
    expect(parsed.date).toBeNull();
  });

  it('does not read the label of a Markdown link as a date', () => {
    const parsed = parseShorthand('Read [tomorrow](https://example.com)', snapshot, true);
    expect(parsed.date).toBeNull();
    expect(parsed.content).toBe('Read [tomorrow](https://example.com)');
  });

  it('does not read a tag, a project or an estimate inside an address', () => {
    const parsed = parseShorthand('Follow https://medium.com/@someone/(25)', snapshot, true);
    expect(parsed.labels).toEqual([]);
    expect(parsed.minutes).toBeNull();
  });

  it('still reads the shorthand typed next to a link', () => {
    const parsed = parseShorthand('Read https://example.com p1 tomorrow @later', snapshot, true);
    expect(parsed.priority).toBe(1);
    expect(parsed.date).not.toBeNull();
    expect(parsed.labels).toEqual(['later']);
    expect(parsed.content).toBe('Read https://example.com');
  });

  it('leaves a link the caller turned down unmarked, and its words unread', () => {
    const raw = 'Read https://example.com/p1';
    const at = raw.indexOf('https');
    const parsed = parseShorthand(raw, snapshot, true, [{ start: at, end: raw.length }]);
    expect(parsed.ranges.some((r) => r.kind === 'link')).toBe(false);
    expect(parsed.priority).toBeNull();
  });
});

describe('a tag starts a word (#135 follow-up)', () => {
  it('does not read a tag inside @@link0@@ or an email address', () => {
    for (const text of ['@@link0@@', 'Write to me@example.com', 'a@b']) {
      const parsed = parseShorthand(text, snapshot, true);
      expect(parsed.labels).toEqual([]);
      expect(parsed.content).toBe(text);
    }
  });

  it('still reads a tag after a space or at the start', () => {
    expect(parseShorthand('@home water', snapshot, true).labels).toEqual(['home']);
    expect(parseShorthand('water @home @later', snapshot, true).labels).toEqual(['home', 'later']);
  });
});
