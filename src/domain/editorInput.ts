import { inlineSpans } from './inlineMarks';
import type { EnterResult } from './descriptionLines';

/** A pasted/entered web address, with an implicit secure scheme for domains. */
export function normalizeLink(input: string): string | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^https?:\/\//i.test(text) && !/^(?:[\p{L}\d](?:[\p{L}\d-]*[\p{L}\d])?\.)+[\p{L}]{2,}(?::\d+)?(?:[/?#].*)?$/u.test(text)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname && !url.username && !url.password ? (/^https?:\/\//i.test(text) ? text : `https://${text}`) : null;
  } catch { return null; }
}

/** Balance inline formatting on both sides of a new paragraph. Links end here. */
export function richEnter(text: string, caret: number, split: (text: string, caret: number) => EnterResult): EnterResult {
  const active = inlineSpans(text).filter(span => span.open[0] !== span.open[1] && span.open[1] <= caret && caret <= span.close[0]);
  if (!active.length) return split(text, caret);
  let left = text.slice(0, caret);
  let right = text.slice(caret);
  // Enclosing spans appear first; close innermost first and reopen outermost first.
  for (const span of [...active].reverse()) left += text.slice(...span.close);
  const links = active.filter(span => span.kind === 'link');
  for (const link of [...links].sort((a,b) => b.close[0] - a.close[0])) {
    const at = link.close[0] - caret;
    right = right.slice(0, at) + right.slice(at + link.close[1] - link.close[0]);
  }
  const opening = active.filter(span => span.kind !== 'link').map(span => text.slice(...span.open)).join('');
  const result = split(left + right, left.length);
  if (result.next !== null) {
    result.next = result.next.slice(0,result.caret) + opening + result.next.slice(result.caret);
    result.caret += opening.length;
  }
  return result;
}
