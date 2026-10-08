import { describe, expect, it } from 'vitest';
import { inlineSpans } from './inlineMarks';

const kinds = (text: string) => inlineSpans(text).map((span) => [span.kind, text.slice(span.from, span.to)]);

describe('the inline Markdown of a description line (#157)', () => {
  it('finds bold, italic, struck, code and links with their markers', () => {
    expect(kinds('a **b** c *d* e ~~f~~ g `h` [i](https://x.io)')).toEqual([
      ['strong', '**b**'], ['em', '*d*'], ['del', '~~f~~'], ['code', '`h`'], ['link', '[i](https://x.io)'],
    ]);
    const [bold] = inlineSpans('**b**');
    expect(bold.open).toEqual([0, 2]);
    expect(bold.close).toEqual([3, 5]);
  });

  it('reads a bare address as a link with no syntax to hide', () => {
    const [link] = inlineSpans('see https://example.com now');
    expect(link.kind).toBe('link');
    expect(link.open[0]).toBe(link.open[1]);
    expect(link.href).toBe('https://example.com');
  });

  it('leaves what is inside code alone, and a snake_case word, and a lone star', () => {
    expect(kinds('`**not bold**` and snake_case_name and 2 * 3 * 4')).toEqual([['code', '`**not bold**`']]);
  });

  it('is in reading order', () => {
    expect(inlineSpans('*a* **b**').map((span) => span.kind)).toEqual(['em', 'strong']);
  });
});
