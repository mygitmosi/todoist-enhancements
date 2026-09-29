import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provisionalDue } from './tasks';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 10, 0)); });
afterEach(() => vi.useRealTimers());

const rule = (string: string) =>
  ({ date: '', timezone: null, string, lang: 'fr', is_recurring: true }) as never;

describe('the date drawn for a task created from a repeat rule (#130)', () => {
  it('carries the time the rule names', () => {
    expect(provisionalDue(rule('tous les jours à 15h'))?.date).toBe('2026-09-30T15:00:00');
    expect(provisionalDue(rule('every day at 9:30'))?.date).toBe('2026-09-30T09:30:00');
    expect(provisionalDue(rule('every weekday at 3pm'))?.date).toBe('2026-09-30T15:00:00');
  });

  it('is today with no time when the rule names none', () => {
    expect(provisionalDue(rule('tous les jours'))?.date).toBe('2026-09-30');
    expect(provisionalDue(rule('every 15 days'))?.date).toBe('2026-09-30');
  });

  it('leaves a real date alone', () => {
    const due = { date: '2026-10-05', timezone: null, string: '2026-10-05', lang: 'en', is_recurring: false };
    expect(provisionalDue(due)).toBe(due);
  });
});
