/** Markdown description lines and their editing behavior. */

export type LineKind = 'paragraph' | 'heading' | 'bullet' | 'number' | 'task' | 'rule' | 'quote';

export interface NoteLine {
  kind: LineKind;
  /** Everything before the words: the marker and its spaces. */
  prefix: string;
  /** The words after it. */
  text: string;
  /** Heading level, 1 to 3. */
  level?: 1 | 2 | 3;
  /** The number of a numbered line. */
  n?: number;
  /** A task line that is ticked. */
  checked?: boolean;
}

const TASK = /^( {0,3})([-*]) \[([ xX])\]( .*)?$/;
const HEADING = /^(#{1,6}) (.*)$/;
const BULLET = /^( {0,3})([-*+]) (.*)$/;
const NUMBER = /^( {0,3})(\d{1,3})([.)]) (.*)$/;

export function readLine(line: string): NoteLine {
  if (/^ {0,3}-{3,}\s*$/.test(line)) return { kind: 'rule', prefix: line, text: '' };
  if (/^> ?/.test(line)) { const prefix = /^> ?/.exec(line)![0]; return { kind: 'quote', prefix, text: line.slice(prefix.length) }; }
  const task = TASK.exec(line);
  if (task) {
    const rest = task[4] ?? '';
    return {
      kind: 'task', prefix: line.slice(0, line.length - rest.length) + (rest ? ' ' : ''),
      text: rest.slice(1), checked: task[3] !== ' ',
    };
  }
  const heading = HEADING.exec(line);
  if (heading) {
    return {
      kind: 'heading', prefix: `${heading[1]} `, text: heading[2],
      level: Math.min(3, heading[1].length) as 1 | 2 | 3,
    };
  }
  const bullet = BULLET.exec(line);
  if (bullet) return { kind: 'bullet', prefix: `${bullet[1]}${bullet[2]} `, text: bullet[3] };
  const number = NUMBER.exec(line);
  if (number) {
    return {
      kind: 'number', prefix: `${number[1]}${number[2]}${number[3]} `, text: number[4], n: Number(number[2]),
    };
  }
  return { kind: 'paragraph', prefix: '', text: line };
}

/** The prefix an item after this one starts with, or null for a line that is not a list. */
export function continuation(line: NoteLine): string | null {
  switch (line.kind) {
    case 'bullet': case 'quote': return line.prefix;
    case 'number': {
      const parts = /^( {0,3})(\d{1,3})([.)]) $/.exec(line.prefix);
      return parts ? `${parts[1]}${(line.n ?? 0) + 1}${parts[3]} ` : null;
    }
    case 'task': return `${line.prefix.match(/^ {0,3}[-*]/)?.[0] ?? '-'} [ ] `;
    default: return null;
  }
}

export interface EnterResult {
  /** What the line becomes. */
  line: string;
  /** The line after it, when there is one. */
  next: string | null;
  /** Where the caret goes in `next`, or in `line` when there is no next. */
  caret: number;
}

/**
 * Enter at `caret`. In a list it carries on the list, and on an empty item it
 * ends it: the marker goes and the line is left empty, with no new line.
 */
export function pressEnter(text: string, caret: number): EnterResult {
  const line = readLine(text);
  const next = continuation(line);
  if (next !== null && caret >= line.prefix.length) {
    if (line.text.trim() === '') return { line: '', next: null, caret: 0 };
    // The space the caret was standing before belongs to the old line, not to the new item.
    return { line: text.slice(0, caret).trimEnd(), next: next + text.slice(caret).trimStart(), caret: next.length };
  }
  return { line: text.slice(0, caret), next: text.slice(caret), caret: 0 };
}
