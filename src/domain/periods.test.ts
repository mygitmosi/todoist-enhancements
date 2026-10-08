import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startOfDay } from 'date-fns';
import {
  bucketKey, bucketsOf, daysOf, granularitiesOf, previousRange, rangeFor, shiftBucket, spanOf,
} from './periods';

/* The bug these guard (#170): stepping a day as 24 hours never leaves the day
   clocks go back, which lasts 25 hours, so a loop over any month, quarter or
   year containing it never ended and the page froze. Run in the zone where
   that happened. */
const ZONE = 'Europe/Paris';
let before: string | undefined;
beforeAll(() => { before = process.env.TZ; process.env.TZ = ZONE; });
afterAll(() => { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; });

const ranges = (now: Date) => ({
  month: rangeFor('month', 0, null, 1, now),
  quarter: rangeFor('quarter', 0, null, 1, now),
  year: rangeFor('year', 0, null, 1, now),
});

describe('days across a clock change', () => {
  it('lists a month containing the 25-hour day, once each', () => {
    const { month } = ranges(new Date(2026, 9, 7));
    const days = daysOf(month);
    expect(days).toHaveLength(31);
    expect(new Set(days.map((d) => bucketKey(d, 'day'))).size).toBe(31);
    expect(days.every((d) => d.getHours() === 0)).toBe(true);
  });

  it('lists a month containing the 23-hour day, once each', () => {
    const days = daysOf(ranges(new Date(2026, 2, 10)).month);
    expect(days).toHaveLength(31);
    expect(days.every((d) => d.getHours() === 0)).toBe(true);
  });

  it('steps from the 25-hour day to the next one', () => {
    const day = startOfDay(new Date(2026, 9, 25));
    expect(bucketKey(shiftBucket(day, 'day', 1), 'day')).toBe('2026-10-26');
    expect(bucketKey(shiftBucket(day, 'day', -1), 'day')).toBe('2026-10-24');
  });

  it('covers a quarter and a year in whole days and whole months', () => {
    const { quarter, year } = ranges(new Date(2026, 9, 7));
    expect(daysOf(quarter)).toHaveLength(92);
    expect(daysOf(year)).toHaveLength(365);
    expect(bucketsOf(quarter, 'month').map((d) => bucketKey(d, 'month')))
      .toEqual(['2026-10', '2026-11', '2026-12']);
    expect(bucketsOf(year, 'month')).toHaveLength(12);
  });

  it('counts a month by its calendar days, whatever the clocks did', () => {
    const november = ranges(new Date(2026, 10, 7)).month;
    expect(spanOf(ranges(new Date(2026, 9, 7)).month)).toBe(31);
    expect(spanOf(november)).toBe(30);
    // The comparison is the same number of days, ending the day before.
    expect(spanOf(previousRange(november))).toBe(30);
  });
});

describe('what each range is read in', () => {
  it('reads a day as nothing, a month by day, a quarter and a year by month', () => {
    expect(granularitiesOf(1)).toEqual([]);
    expect(granularitiesOf(7)).toEqual(['day']);
    expect(granularitiesOf(31)).toEqual(['day']);
    expect(granularitiesOf(92, 'quarter')).toEqual(['month']);
    expect(granularitiesOf(365)).toEqual(['month']);
  });

  it('lets a range of your own between a month and half a year be read either way', () => {
    expect(granularitiesOf(45, 'custom')).toEqual(['day', 'month']);
    expect(granularitiesOf(120, 'custom')).toEqual(['day', 'month']);
  });
});
