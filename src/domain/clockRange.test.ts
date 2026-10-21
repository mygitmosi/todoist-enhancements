import { describe, expect, it } from 'vitest';
import { parseShorthand } from './shorthand';
import { emptySnapshot } from './types';
import { readClockRange } from './clockRange';

describe('explicit clock spans in the composer', () => {
  it.each([['de 12h à 12h12', 720, 12], ['de 12h30 à 14h', 750, 90], ['from 09:15 to 10:00', 555, 45], ['de 23h à 1h', 1380, 120]])('reads %s', (text, start, minutes) => {
    expect(readClockRange(text as string)).toMatchObject({ start, minutes });
  });
  it.each(['de 25h à 13h', 'de 12h75 à 14h', 'de 12h à 12h', 'de 12h à'])('leaves invalid span %s unread', (text) => expect(readClockRange(text)).toBeNull());
  it('keeps an explicit day and writes the span as the estimate', () => {
    const result = parseShorthand('Rendez-vous demain de 12h à 12h12', emptySnapshot(), true);
    expect(result.content).toBe('Rendez-vous');
    expect(result.date).toMatch(/T12:00:00$/);
    expect(result.minutes).toBe(12);
  });
  it('uses the day prefilled by a calendar slot', () => {
    const result = parseShorthand('Rendez-vous de 12h à 13h', emptySnapshot(), true, [], 'dmy', undefined, '2026-11-20T09:00:00');
    expect(result.date).toBe('2026-11-20T12:00:00');
    expect(result.minutes).toBe(60);
  });
  it('keeps links and refused phrases intact', () => {
    const text = 'Lire [de 12h à 13h](https://example.com)';
    expect(parseShorthand(text, emptySnapshot(), true).minutes).toBeNull();
    const raw = 'Rendez-vous de 12h à 13h';
    expect(parseShorthand(raw, emptySnapshot(), true, [{ start: 11, end: raw.length }]).minutes).toBeNull();
  });
});
