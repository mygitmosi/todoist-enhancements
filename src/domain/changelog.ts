/**
 * The changelog, read back inside the app (#115).
 *
 * CHANGELOG.md is the one place a release is described, written for GitHub.
 * The app reads the same file rather than a second copy of it, so what the
 * "What's new" dialog says after an update is exactly what the release said.
 *
 * The file's shape is fixed by its own header: a `## x.y.z` heading per
 * release, a short paragraph saying what the release is about, then one
 * paragraph per change, each opening with 🆕 (new), 🎨 (redesigned or
 * reworded) or 🐛 (fixed) and a bold title.
 */

export type ChangeKind = 'new' | 'design' | 'fix';

export interface Change {
  kind: ChangeKind;
  /** The emoji the line opens with, as the file writes it. */
  mark: string;
  /** The rest of the paragraph, Markdown, the emoji taken off. */
  text: string;
}

export interface Release {
  version: string;
  /** The paragraph under the heading, when there is one. */
  intro: string;
  changes: Change[];
}

const MARKS: Array<[string, ChangeKind]> = [['🆕', 'new'], ['🎨', 'design'], ['🐛', 'fix']];

/** The order a release reads in: from the most visible to the least. */
const KIND_ORDER: Record<ChangeKind, number> = { new: 0, design: 1, fix: 2 };

/** Reads every release in the file, newest first as the file has them. */
export function parseChangelog(source: string): Release[] {
  const releases: Release[] = [];
  let current: Release | null = null;

  const paragraphs = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const raw of paragraphs) {
    const paragraph = raw.trim();
    if (!paragraph) continue;

    const heading = paragraph.match(/^##\s+v?(\d+\.\d+\.\d+)\s*(?:\n([\s\S]*))?$/);
    if (heading) {
      current = { version: heading[1], intro: '', changes: [] };
      releases.push(current);
      /* A heading glued to its first paragraph, with no blank line between,
         is still one heading and one paragraph. */
      if (heading[2]?.trim()) addParagraph(current, heading[2].trim());
      continue;
    }
    // Anything before the first release is the file's own header.
    if (!current) continue;
    addParagraph(current, paragraph);
  }
  /* Each release reads by impact, whatever order it was written in: what is
     new first, then what looks different, then what was fixed. A stable sort,
     so within a kind the author's order stands (most visible first) (#148). */
  for (const release of releases) {
    release.changes.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  }
  return releases;
}

function addParagraph(release: Release, paragraph: string): void {
  const text = paragraph.replace(/\s*\n\s*/g, ' ');
  const found = MARKS.find(([mark]) => text.startsWith(mark));
  if (found) {
    const [mark, kind] = found;
    release.changes.push({ kind, mark, text: text.slice(mark.length).trim() });
    return;
  }
  /* A paragraph that is not a change continues the one before it (a change
     written over two paragraphs), or is the release's introduction. */
  const last = release.changes[release.changes.length - 1];
  if (last) last.text += ` ${text}`;
  else release.intro = release.intro ? `${release.intro} ${text}` : text;
}

/** -1, 0 or 1, comparing two `x.y.z` versions numerically. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let at = 0; at < 3; at += 1) {
    const diff = (left[at] || 0) - (right[at] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * The releases someone has not been told about yet.
 *
 * Everything after the version they last saw, up to the one running. Never
 * having seen one — an account that used the app before the dialog existed —
 * is told about the running one only, not about every release since 0.1.
 */
export function unseenReleases(
  releases: Release[], running: string, seen: string | null,
): Release[] {
  return releases.filter((release) =>
    compareVersions(release.version, running) <= 0
    && (seen === null
      ? compareVersions(release.version, running) === 0
      : compareVersions(release.version, seen) > 0));
}

/**
 * Whether a set of releases is worth a dialog: any release that says anything.
 *
 * Every release opens the window once after an update, not only those with a
 * 🆕: a release made of fixes and redesigns used to be marked as read without
 * anyone being told (#148).
 */
export const hasChanges = (releases: Release[]): boolean =>
  releases.some((release) => release.changes.length > 0);

/**
 * The releases in the reader's language.
 *
 * The French file only carries the releases that have been translated; a
 * release it does not have is shown from the English one rather than left
 * out, and says so.
 */
export function localisedReleases(
  english: Release[], translated: Release[] | null,
): Array<Release & { untranslated: boolean }> {
  if (!translated) return english.map((release) => ({ ...release, untranslated: false }));
  const byVersion = new Map(translated.map((release) => [release.version, release]));
  return english.map((release) => {
    const local = byVersion.get(release.version);
    return local ? { ...local, untranslated: false } : { ...release, untranslated: true };
  });
}
