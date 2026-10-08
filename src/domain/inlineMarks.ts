import { findLinks } from './markdown';

/**
 * Where the inline Markdown of one line sits (#157), for an editor that
 * formats as it is typed: the span, and the characters that are only syntax,
 * so they can be quiet while the caret is on the line and gone when it is not.
 *
 * It reads the same rules as the renderer (code, links, bold, italic,
 * strikethrough), in the same order, so what the editor shows while writing is
 * what the page shows after.
 */
export type MarkKind = 'strong' | 'em' | 'del' | 'code' | 'link';

export interface InlineSpan {
  kind: MarkKind;
  /** The whole span, markers included, as offsets into the text. */
  from: number;
  to: number;
  /** The syntax before and after the words: `**` and `**`, or `[` and `](url)`. Empty for a bare address. */
  open: [number, number];
  close: [number, number];
  /** The address a link goes to. */
  href?: string;
}

const EMPHASIS: Array<{ kind: MarkKind; pattern: RegExp; width: number }> = [
  { kind: 'strong', pattern: /\*\*\*[\s\S]*?\*\*\*/g, width: 2 },
  { kind: 'strong', pattern: /\*\*([\s\S]*?)\*\*/g, width: 2 },
  { kind: 'strong', pattern: /__([^_]+)__/g, width: 2 },
  { kind: 'del', pattern: /~~([^~]+)~~/g, width: 2 },
  { kind: 'em', pattern: /(?<![*\w])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?!\*)/g, width: 1 },
  { kind: 'em', pattern: /(?<![_\w])_(?![\s_])([^_\n]+?)(?<![\s_])_(?![_\w])/g, width: 1 },
];

export function inlineSpans(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const claimed: Array<[number, number]> = [];
  const free = (from: number, to: number) => !claimed.some(([a, b]) => from < b && to > a && !(from < a && to > b));
  const take = (span: InlineSpan) => {
    if (!free(span.from, span.to)) return;
    claimed.push([span.from, span.to]);
    spans.push(span);
  };

  // Code is read first, so nothing inside it is anything else.
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const from = match.index!;
    const to = from + match[0].length;
    take({ kind: 'code', from, to, open: [from, from + 1], close: [to - 1, to] });
  }
  for (const link of findLinks(text)) {
    const bracket = text[link.start] === '[';
    const labelEnd = link.start + 1 + link.label.length;
    take({
      kind: 'link', from: link.start, to: link.end, href: link.href,
      open: bracket ? [link.start, link.start + 1] : [link.start, link.start],
      close: bracket ? [labelEnd, link.end] : [link.end, link.end],
    });
  }
  for (const { kind, pattern, width } of EMPHASIS) {
    for (const match of text.matchAll(pattern)) {
      const from = match.index!;
      const to = from + match[0].length;
      take({ kind, from, to, open: [from, from + width], close: [to - width, to] });
    }
  }
  // Nested styles are real styles too, including bold link labels and bold links.
  const nested = spans.flatMap((span) => {
    if (span.kind === 'code' || span.open[0] === span.open[1]) return [span];
    const offset = span.open[1];
    return [span, ...inlineSpans(text.slice(offset, span.close[0])).map((child) => ({
      ...child, from: child.from + offset, to: child.to + offset,
      open: [child.open[0] + offset, child.open[1] + offset] as [number, number],
      close: [child.close[0] + offset, child.close[1] + offset] as [number, number],
    }))];
  });
  return nested.filter((span, index) => nested.findIndex((other) => other.kind === span.kind && other.from === span.from && other.to === span.to) === index)
    .sort((a, b) => a.from - b.from || b.to - a.to);
}
