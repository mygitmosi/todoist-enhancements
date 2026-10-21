import { describe, expect, it } from 'vitest';
import english from '../../CHANGELOG.md?raw';
import french from '../../CHANGELOG.fr.md?raw';
import { parseChangelog } from './changelog';
import { CHANGELOG_VISUALS, changelogVisual } from './changelogVisuals';

describe('changelog entry length', () => {
  it('keeps every entry to 350 characters, title included', () => {
    for (const [language, source] of [['en', english], ['fr', french]] as const) {
      for (const release of parseChangelog(source)) {
        for (const change of release.changes) expect(change.text.length, `${language} ${release.version} ${change.text.slice(0, 40)}`).toBeLessThanOrEqual(350);
      }
    }
  });
});

describe('editorial changelog illustrations', () => {
  it('keeps illustrated entries aligned with both source histories', () => {
    const en = parseChangelog(english), fr = parseChangelog(french);
    for (const key of Object.keys(CHANGELOG_VISUALS)) {
      const [version, index] = key.split(':');
      const source = en.find((release) => release.version === version)?.changes[Number(index)];
      expect(source, key).toBeDefined();
      expect(source?.kind, key).not.toBe('fix');
      const translated = fr.find((release) => release.version === version);
      if (translated) expect(translated.changes[Number(index)]?.kind, key).toBe(source?.kind);
    }
  });
  it('illustrates the sidebar filters and keeps unrelated corrections text-only', () => {
    expect(changelogVisual('2.2.0', 0)).toBe('sidebarFilters');
    expect(changelogVisual('2.2.0', 1)).toBe('filterEditor');
    expect(changelogVisual('2.9.0', 6)).toBeNull();
    expect(changelogVisual('2.9.0', 3)).toBeNull();
    expect(changelogVisual('2.6.0', 0)).toBeNull();
    expect(changelogVisual('99.0.0', 0)).toBeNull();
    expect(changelogVisual('2.0.0', 6)).toBe('projectView');
  });
});
