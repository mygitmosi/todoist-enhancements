import { readNaturalDate } from './nlp';
import { findLinks } from './markdown';
import { readRecurrence, type RecurrenceLang } from './recurrence';
import { parseDurationInput } from './estimates';
import { colorValue } from './colors';
import type { DisplayPriority, Snapshot } from './types';

/**
 * Everything a task's name is carrying, and exactly where it carries it.
 *
 * This used to be two functions in two files: one that produced the values and
 * one that produced the coloured marks behind the text. They read the same
 * string with two slightly different sets of rules, which is how a name could
 * end up marked as having a project it did not pass on, or a date shown in the
 * field that was not the date the task got. Marks and values are now the same
 * answer read once — a range is what was matched, and the value is what that
 * range meant.
 *
 * `#project`, `p1`..`p4`, `@tag` and `(25)` are syntax: they were typed on
 * purpose and are always honoured. The date is a guess made from prose, so it
 * is the only part the caller can switch off.
 *
 * Any reading can also be refused one at a time. A refusal is a range of the
 * text, not a word: "Weekly review weekly" can have its first `weekly` read as
 * plain English and its second read as a repeat rule, because what was refused
 * was those seven characters at that position and nothing else. Refused ranges
 * are blanked out for every reader, so refusing the guess the parser led with
 * lets the next candidate in the same sentence be found — refuse the `Weekly`
 * in "Weekly review every monday" and the rule becomes "every monday".
 */

export type HighlightKind =
  'date' | 'recurrence' | 'project' | 'priority' | 'label' | 'duration' | 'link';

export interface Highlight {
  start: number;
  end: number;
  kind: HighlightKind;
  /**
   * The colour the mark is drawn in, when the thing it names has one of its
   * own — the project's colour, the tag's, the priority's. A guess made from
   * prose has none and wears the accent instead.
   */
  tone?: string;
  /**
   * A link is shown, not read: it stays in the name that is saved, so it
   * only ever gets an underline in the mirror, never a claim on the text
   * `strip` takes out.
   */
  keep?: boolean;
}

/** A stretch of the name, by position in it. */
export interface TextRange {
  start: number;
  end: number;
}

export interface Shorthand {
  /** The name with every recognised phrase taken out of it. */
  content: string;
  projectId: string | null;
  /** A section of that project, when the name said `#Project/Section`. */
  sectionId: string | null;
  priority: DisplayPriority | null;
  labels: string[];
  /** `yyyy-MM-dd`, or with a time when one was given. */
  date: string | null;
  /**
   * A repeat rule, as typed, to be sent on as `due.string`.
   *
   * Never resolved to a date here: Todoist owns what "every 3 days" lands on,
   * and computing it twice is how the two answers come to disagree.
   */
  recurrence: { string: string; lang: RecurrenceLang; fromCompletion: boolean } | null;
  /** An estimate in minutes, written in brackets: "Call Anne (25)". */
  minutes: number | null;
  /** Where each of the above sits in the original string. */
  ranges: Highlight[];
}

const fold = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

/** Characters a sentence can end with, straight after a name. */
const TRAILING = /[.,;:!?…)\]}"'»]$/u;

/**
 * The longest start of `text` that names something: the whole of it, or it
 * with the punctuation that closes a sentence taken off the end, one mark at a
 * time. `length` is how much of `text` the name used.
 */
function readName<T>(text: string, find: (name: string) => T | undefined): { found: T; length: number } | null {
  let candidate = text;
  while (candidate) {
    const found = find(candidate);
    if (found) return { found, length: candidate.length };
    if (!TRAILING.test(candidate)) return null;
    candidate = candidate.slice(0, -1);
  }
  return null;
}

export function parseShorthand(
  raw: string, snapshot: Snapshot, naturalDates: boolean, refused: TextRange[] = [],
): Shorthand {
  const ranges: Highlight[] = [];
  const claim = (start: number, length: number, kind: HighlightKind, tone?: string, keep?: boolean) =>
    ranges.push({ start, end: start + length, kind, tone, keep });

  /** Whether a candidate covers ground the caller has already turned down. */
  const isRefused = (start: number, length: number) =>
    refused.some((r) => start < r.end && start + length > r.start);

  let projectId: string | null = null;
  let sectionId: string | null = null;
  let priority: DisplayPriority | null = null;
  const labels: string[] = [];
  let minutes: number | null = null;

  /*
   * Each reader takes the LAST candidate it has not been turned down on.
   *
   * A name carries one project and one priority, so two of either is somebody
   * changing their mind: the one just typed is the one meant, and the earlier
   * one stops being marked. Refusing the newer hands the reading back to the
   * older, which is the same rule read from the other end.
   */
  /* `#Project/Section` names both at once, the way the move menu offers both:
     a task that belongs in a section of a project should not need the project
     said here and the section chosen in a field underneath. */
  let projectClaim: { start: number; length: number; tone: string } | null = null;
  /* Any name Todoist allows, not just letters and digits: `#aliasdigital.`,
     `#R&D`, `#Maison 🏡` once its space is gone (#102). The token runs to the
     next space; a `/` in it names a section. Punctuation that ends a sentence
     straight after a project (`… #Perso.`) is let go of when the name without
     it is the one that exists — and kept when the name ends with it. */
  const projects = Object.values(snapshot.projects).filter((p) => !p.is_deleted && !p.is_archived);
  const findProject = (text: string) => projects.find((p) => fold(p.name) === fold(text));
  for (const token of raw.matchAll(/(?:^|\s)#(\S+)/gu)) {
    const hash = token.index! + token[0].indexOf('#');
    const [projectText, ...rest] = token[1].split('/');
    const sectionText = rest.length > 0 ? rest.join('/') : null;
    const project = readName(projectText, findProject);
    if (!project) continue;
    const whole = project.length === projectText.length;
    const tokenLength = 1 + (whole && sectionText !== null ? token[1].length : project.length);
    if (isRefused(hash, tokenLength)) continue;
    projectId = project.found.id;
    sectionId = null;

    const section = whole && sectionText
      ? readName(sectionText, (text) => Object.values(snapshot.sections).find(
        (s) => s.project_id === project.found.id && !s.is_deleted && !s.is_archived
          && fold(s.name) === fold(text),
      ))
      : null;
    if (section) sectionId = section.found.id;

    /* A section that does not exist leaves the project claimed and the rest of
       the text alone: half a match is still a project you named. */
    projectClaim = {
      start: hash,
      length: 1 + project.length + (section ? 1 + section.length : 0),
      tone: colorValue(project.found.color),
    };
  }
  if (projectClaim) {
    claim(projectClaim.start, projectClaim.length, 'project', projectClaim.tone);
  }

  let flagClaim: { start: number; length: number } | null = null;
  for (const flag of raw.matchAll(/\bp([1-4])\b/gi)) {
    if (isRefused(flag.index!, flag[0].length)) continue;
    priority = Number(flag[1]) as DisplayPriority;
    flagClaim = { start: flag.index!, length: flag[0].length };
  }
  if (flagClaim) {
    claim(flagClaim.start, flagClaim.length, 'priority', `var(--p${priority})`);
  }

  for (const label of raw.matchAll(/@([\p{L}\p{N}_-]+)/gu)) {
    if (isRefused(label.index!, label[0].length)) continue;
    labels.push(label[1]);
    const tag = Object.values(snapshot.labels).find(
      (l) => !l.is_deleted && fold(l.name) === fold(label[1]),
    );
    claim(label.index!, label[0].length, 'label', tag ? colorValue(tag.color) : undefined);
  }

  /* An estimate in brackets. Anything `parseDurationInput` understands goes
     inside them — (25), (1h30), (90 min) — and anything it does not is left
     alone, because brackets in a task name are usually just brackets. */
  let durationClaim: { start: number; length: number } | null = null;
  for (const bracket of raw.matchAll(/\(([^)]{1,12})\)/g)) {
    if (isRefused(bracket.index!, bracket[0].length)) continue;
    const value = parseDurationInput(bracket[1]);
    if (value === null) continue;
    minutes = value;
    durationClaim = { start: bracket.index!, length: bracket[0].length };
  }
  if (durationClaim) claim(durationClaim.start, durationClaim.length, 'duration');

  /* The recurrence is read before the date and out of the same text, because
     the two compete for the same words: "every monday" contains a weekday the
     date reader would otherwise take for next Monday, dating the task once
     instead of repeating it forever. Claiming the range first settles it. */
  /*
   * The same "last one wins" as the project and the priority, and for the same
   * reason: a task happens once. Typing `demain` and then `mercredi` is
   * changing your mind, so the reader keeps looking past what it has already
   * found and marks the last phrase rather than the first — and refusing that
   * one hands the day back to the one before it.
   *
   * Each candidate is blanked before looking again, so the search always moves
   * forward and a phrase can never find itself.
   */
  let recurrence: Shorthand['recurrence'] = null;
  if (naturalDates) {
    let text = mask(raw, [...ranges, ...refused]);
    let last: { at: number; length: number; reading: ReturnType<typeof readRecurrence> } | null = null;
    for (let guard = 0; guard < 8; guard += 1) {
      const repeat = readRecurrence(text);
      if (!repeat) break;
      last = { at: repeat.index, length: repeat.matched.length, reading: repeat };
      text = blank(text, repeat.index, repeat.matched.length);
    }
    if (last?.reading) {
      recurrence = {
        string: last.reading.string,
        lang: last.reading.lang,
        fromCompletion: last.reading.fromCompletion,
      };
      claim(last.at, last.length, 'recurrence');
    }
  }

  let date: string | null = null;
  if (naturalDates) {
    /* The date is read from what the explicit syntax has not already claimed,
       blanked out rather than removed so every index still points at the same
       character of the original string. */
    let text = mask(raw, [...ranges, ...refused]);
    let last: { at: number; length: number; date: string } | null = null;
    for (let guard = 0; guard < 8; guard += 1) {
      const reading = readNaturalDate(text);
      if (!reading) break;
      last = { at: reading.index, length: reading.matched.length, date: reading.date };
      text = blank(text, reading.index, reading.matched.length);
    }
    if (last) {
      date = last.date;
      claim(last.at, last.length, 'date');
    }
  }

  /* A link, marked last and never over ground something else already
     claimed — a URL's own `#fragment` is not a project, but a name typed
     with both is read as whichever came first. */
  for (const span of findLinks(raw)) {
    if (isRefused(span.start, span.end - span.start)) continue;
    claim(span.start, span.end - span.start, 'link', undefined, true);
  }

  const clean = dedupe(ranges);
  return {
    content: strip(raw, clean),
    projectId, sectionId, priority, labels, date, recurrence, minutes,
    ranges: clean,
  };
}

/**
 * Carries refusals across an edit of the text they point into.
 *
 * A refusal is held as a position, so every keystroke before it would leave it
 * pointing at the wrong word. The edit is found as the one stretch that differs
 * between the two strings: ranges before it are untouched, ranges after it
 * shift by what the edit added or removed, and a range the edit reached into is
 * dropped — its words are not the words that were refused any more, so the
 * reading deserves to be offered again.
 */
export function carryRanges(
  ranges: TextRange[], before: string, after: string,
): TextRange[] {
  if (before === after) return ranges;

  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head += 1;

  let tail = 0;
  while (
    tail < before.length - head
    && tail < after.length - head
    && before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) tail += 1;

  const editEnd = before.length - tail;
  const delta = after.length - before.length;

  return ranges.flatMap((range) => {
    if (range.end <= head) return [range];
    if (range.start >= editEnd) return [{ start: range.start + delta, end: range.end + delta }];
    return [];
  });
}

/** Overlaps would break the mirror's markup, so the earliest range wins. */
function dedupe(ranges: Highlight[]): Highlight[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const clean: Highlight[] = [];
  for (const range of sorted) {
    if (clean.length === 0 || range.start >= clean[clean.length - 1].end) clean.push(range);
  }
  return clean;
}

/** The same text with one stretch of it turned to spaces. */
const blank = (text: string, start: number, length: number): string =>
  text.slice(0, start) + ' '.repeat(length) + text.slice(start + length);

const mask = (raw: string, ranges: TextRange[]): string => {
  const out = raw.split('');
  for (const range of ranges) {
    for (let at = range.start; at < range.end; at += 1) out[at] = ' ';
  }
  return out.join('');
};

const strip = (raw: string, ranges: Highlight[]): string => {
  let out = '';
  let cursor = 0;
  for (const range of [...ranges].filter((r) => !r.keep).sort((a, b) => a.start - b.start)) {
    out += raw.slice(cursor, range.start);
    cursor = range.end;
  }
  out += raw.slice(cursor);
  return out.replace(/\s{2,}/g, ' ').trim();
};
