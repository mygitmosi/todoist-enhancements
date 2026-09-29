import { describe, expect, it } from 'vitest';
import { readNaturalDate } from './nlp';

/* A Monday, so nothing below depends on which day the tests happen to run. */
const now = new Date(2026, 8, 28);

const read = (text: string, options?: Parameters<typeof readNaturalDate>[2]) =>
  readNaturalDate(text, now, options);

describe('a month is read from its own words, not its first three letters (#123)', () => {
  it('reads « 14 juillet » as July, not June', () => {
    expect(read('Fête 14 juillet')?.date).toBe('2027-07-14');
  });

  it('reads an ordinal day: « 1er juillet », "July 1st"', () => {
    expect(read('Réunion 1er juillet')?.date).toBe('2027-07-01');
    expect(read('Party July 1st')?.date).toBe('2027-07-01');
  });

  it('reads the abbreviations both languages use', () => {
    expect(read('sept 10')?.date).toBe('2027-09-10');
    expect(read('10 sept.')?.matched).toBe('10 sept.');
    expect(read('14 juil')?.date).toBe('2027-07-14');
    expect(read('Call 3 mars')?.date).toBe('2027-03-03');
  });

  it.each([
    'Visiter 2 maisons',
    'Acheter 3 marrons',
    'Buy 2 apricots',
    'Review 2 decks',
  ])('reads nothing in "%s"', (text) => {
    expect(read(text)).toBeNull();
  });

  it('skips a day the month does not have', () => {
    expect(read('31 février')).toBeNull();
  });

  it('keeps the month that starts first when a sentence holds two', () => {
    expect(read('du 3 mars au 9 mai')?.matched).toBe('3 mars');
  });
});

describe('a numeric date follows the Date format setting (#123)', () => {
  it('reads 12/03 day first by default', () => {
    expect(read('Call 12/03')?.date).toBe('2027-03-12');
  });

  it('reads 12/03 month first when the setting says so', () => {
    expect(read('Call 12/03', { dateFormat: 'mdy' })?.date).toBe('2026-12-03');
  });

  it.each(['dmy', 'ymd', 'numeric'] as const)('reads 12/03 day first for %s', (dateFormat) => {
    expect(read('Call 12/03', { dateFormat })?.date).toBe('2027-03-12');
  });

  it('reads a year when there is one', () => {
    expect(read('12/03/2027')?.date).toBe('2027-03-12');
  });
});

describe('what already worked keeps working', () => {
  it('reads the named days', () => {
    expect(read('demain')?.date).toBe('2026-09-29');
    expect(read('lundi')?.date).toBe('2026-10-05');
    expect(read('next week')?.date).toBe('2026-10-05');
    expect(read('dans 2 semaines')?.date).toBe('2026-10-12');
  });

  it('reads a day with a time', () => {
    expect(read('tomorrow at 9h')?.date).toBe('2026-09-29T09:00:00');
  });
});
