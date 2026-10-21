import { describe, expect, it } from 'vitest';
import { calendarDue, calendarLanes, calendarPrefs, calendarRange } from './calendar';
import { item, due } from '@/test/items';
import { defaultViewPrefs } from './types';
import { toApiDate } from './dates';

describe('calendar periods', () => {
  it('honours the account week start and includes full weeks at both month edges', () => {
    const range = calendarRange(new Date(2026, 9, 16), 'month', 7);
    expect([toApiDate(range.first), toApiDate(range.last)]).toEqual(['2026-09-27', '2026-10-31']);
    const week = calendarRange(new Date(2026, 9, 16), 'week', 1);
    expect([toApiDate(week.first), toApiDate(week.last)]).toEqual(['2026-10-12', '2026-10-18']);
  });
  it('uses exactly three calendar days across a month boundary', () => {
    const range = calendarRange(new Date(2026, 9, 31), '3-days');
    expect([toApiDate(range.first), toApiDate(range.last)]).toEqual(['2026-10-31', '2026-11-02']);
  });
  it('offers project coloration across projects and priority within one', () => {
    expect(calendarPrefs(defaultViewPrefs(), 'week').coloration).toBe('project');
    expect(calendarPrefs(defaultViewPrefs(), 'project:p').coloration).toBe('priority');
  });
});
describe('calendar placements', () => {
  it('keeps a repeat rule and removes time explicitly on all-day drops', () => {
    const task = item({ due: due('2026-10-16T09:00:00', { is_recurring: true, string: 'every day at 9am' }) });
    expect(calendarDue(task, new Date(2026, 9, 20), null)).toMatchObject({ date: '2026-10-20', is_recurring: true, string: 'every day at 9am', timezone: null });
  });
  it('moves floating times without introducing a timezone', () => {
    expect(calendarDue(item(), new Date(2026, 9, 20), 14 * 60 + 15)).toMatchObject({ date: '2026-10-20T14:15:00', timezone: null });
  });
  it('uses an absolute instant for fixed-zone tasks', () => {
    const task = item({ due: due('2026-10-16T09:00:00Z', { timezone: 'America/New_York' }) });
    const date = new Date(2026, 9, 20, 14, 15);
    expect(calendarDue(task, date, 14 * 60 + 15).date).toBe(date.toISOString());
  });
});
describe('overlapping blocks', () => {
  const timed = (id: string, time: string, minutes: number) => item({ id, due: due(`2026-10-16T${time}:00`), labels: [`est-${minutes}`] });
  it('allocates lanes throughout connected clusters and resets for the next cluster', () => {
    const lanes = calendarLanes([timed('a', '09:00', 120), timed('b', '09:30', 30), timed('c', '10:00', 90), timed('d', '12:00', 30)]);
    expect(lanes.get('a')).toEqual({ lane: 0, count: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, count: 2 });
    expect(lanes.get('c')).toEqual({ lane: 1, count: 2 });
    expect(lanes.get('d')).toEqual({ lane: 0, count: 1 });
  });
});

describe('calendar display persistence', () => {
  it('shares project calendar options while retaining device-local filters', async () => {
    const { defaultPreferences, syncedPreferences, mergeSynced } = await import('@/store/prefs');
    const remote = defaultPreferences('en');
    remote.views['project:p'] = { ...defaultViewPrefs('project:p'), mode: 'calendar', calendar: { presentation: 'month', futureOccurrences: true, completed: true, coloration: 'tag' } };
    const local = defaultPreferences('en');
    local.views['project:p'] = { ...defaultViewPrefs('project:p'), filters: { ...defaultViewPrefs('project:p').filters, priorities: [1] } };
    const merged = mergeSynced(local, syncedPreferences(remote), 'en');
    expect(merged.views['project:p']).toMatchObject({ mode: 'calendar', calendar: remote.views['project:p'].calendar, filters: { priorities: [1] } });
  });
});
