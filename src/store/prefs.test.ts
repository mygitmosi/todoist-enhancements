import { describe, expect, it } from 'vitest';
import {
  defaultPreferences, hydratePreferences, mergeSynced, readSettingsComment, SETTINGS_COMMENT_MARKER,
  settingsCommentContent, settingsCommentMatches, syncedPreferences, type Preferences,
} from './prefs';
import { defaultViewPrefs } from '@/domain/types';

function prefs(overrides: Partial<Preferences> = {}): Preferences {
  return { ...defaultPreferences('en'), ...overrides };
}

const boardProject = {
  ...defaultViewPrefs('project:site'),
  mode: 'board' as const,
};

describe('syncedPreferences', () => {
  it('leaves out what belongs to this window', () => {
    const synced = syncedPreferences(prefs({ sidebarCollapsed: true }));
    expect(synced).not.toHaveProperty('sidebarCollapsed');
  });

  it("shares a project's display, and not other pages'", () => {
    const synced = syncedPreferences(prefs({
      views: { 'project:site': boardProject, week: defaultViewPrefs('week') },
    }));
    expect(Object.keys(synced.views)).toEqual(['project:site']);
    expect(synced.views['project:site']).toMatchObject({ mode: 'board' });
    expect(synced.views['project:site']).not.toHaveProperty('filters');
  });

  it('writes the same text whatever order the views were added in', () => {
    const a = { 'project:a': defaultViewPrefs('project:a'), 'project:b': defaultViewPrefs('project:b') };
    const b = { 'project:b': a['project:b'], 'project:a': a['project:a'] };
    expect(JSON.stringify(syncedPreferences(prefs({ views: a }))))
      .toBe(JSON.stringify(syncedPreferences(prefs({ views: b }))));
  });
});

describe('the settings comment', () => {
  it('reads back what it wrote, stamped', () => {
    const content = settingsCommentContent(prefs({ theme: 'dark' }), 1234);
    expect(content.startsWith(SETTINGS_COMMENT_MARKER)).toBe(true);
    expect(readSettingsComment(content)).toMatchObject({ theme: 'dark', savedAt: 1234 });
  });

  it("ignores a comment that is not the app's", () => {
    expect(readSettingsComment('Buy milk')).toBeNull();
    expect(readSettingsComment(`${SETTINGS_COMMENT_MARKER}\n\nnot json`)).toBeNull();
  });

  it('matches the same settings whatever the stamp', () => {
    const current = prefs({ theme: 'dark' });
    expect(settingsCommentMatches(settingsCommentContent(current, 1), current)).toBe(true);
    expect(settingsCommentMatches(settingsCommentContent(current, 1), prefs({ theme: 'light' })))
      .toBe(false);
  });
});

describe('mergeSynced', () => {
  it('takes the account settings and keeps what belongs to this device', () => {
    const local = prefs({ sidebarCollapsed: true, theme: 'light' });
    const merged = mergeSynced(local, { theme: 'dark', savedAt: 1 }, 'en');
    expect(merged.theme).toBe('dark');
    expect(merged.sidebarCollapsed).toBe(true);
  });

  it("lays a project's shared display over this device's filters", () => {
    const mine = defaultViewPrefs('project:site');
    const local = prefs({ views: { 'project:site': mine, week: defaultViewPrefs('week') } });
    const merged = mergeSynced(local, {
      views: {
        'project:site': {
          mode: 'board', group: mine.group, sort: mine.sort, showSubtasks: false, showCompleted: true,
        },
      },
    }, 'en');
    expect(merged.views['project:site'].mode).toBe('board');
    expect(merged.views['project:site'].filters.showSubtasks).toBe(false);
    expect(merged.views['project:site'].filters.showCompleted).toBe(true);
    expect(merged.views.week).toEqual(local.views.week);
  });
});

describe('the Gathering dust settings (#161)', () => {
  it('start on, at three months', () => {
    expect(defaultPreferences('en')).toMatchObject({ showDustGroup: true, dustAfterMonths: 3 });
  });

  it('travel with the account', () => {
    const synced = syncedPreferences(prefs({ showDustGroup: false, dustAfterMonths: 6 }));
    expect(synced).toMatchObject({ showDustGroup: false, dustAfterMonths: 6 });
    const merged = mergeSynced(prefs(), synced, 'en');
    expect(merged).toMatchObject({ showDustGroup: false, dustAfterMonths: 6 });
  });

  it.each([1, 2, 3, 6, 12])('accept %i months', (months) => {
    expect(hydratePreferences({ dustAfterMonths: months }, 'en').dustAfterMonths).toBe(months);
  });

  it.each([0, 4, 24, -3, 2.5, '3', null, 'soon'])('reject %j and read the default', (value) => {
    expect(hydratePreferences({ dustAfterMonths: value }, 'en').dustAfterMonths).toBe(3);
  });

  it('read an older settings comment, which has neither, as the defaults', () => {
    const content = settingsCommentContent(prefs());
    const stored = JSON.parse(content.slice(SETTINGS_COMMENT_MARKER.length).trim());
    delete stored.showDustGroup;
    delete stored.dustAfterMonths;
    const merged = mergeSynced(prefs(), stored, 'en');
    expect(merged).toMatchObject({ showDustGroup: true, dustAfterMonths: 3 });
  });

  it('turn the group off only when told to', () => {
    expect(hydratePreferences({ showDustGroup: false }, 'en').showDustGroup).toBe(false);
    expect(hydratePreferences({ showDustGroup: 'no' }, 'en').showDustGroup).toBe(true);
  });
});

describe('estimate storage preference', () => {
  it('defaults to not asked, rejects unknown values and syncs a confirmed choice', () => {
    expect(defaultPreferences('en').estimateStorage).toBeNull();
    expect(hydratePreferences({ estimateStorage: 'unknown' }, 'en').estimateStorage).toBeNull();
    expect(syncedPreferences(prefs({ estimateStorage: 'duration' })).estimateStorage).toBe('duration');
    expect(mergeSynced(prefs(), syncedPreferences(prefs({ estimateStorage: 'tag' })), 'en').estimateStorage).toBe('tag');
  });
  it('does not mark old synced settings as a confirmed choice', () => {
    const { estimateStorage: _unused, ...legacy } = syncedPreferences(prefs());
    expect(mergeSynced(prefs({ estimateStorage: 'duration' }), legacy, 'en').estimateStorage).toBeNull();
  });
});
