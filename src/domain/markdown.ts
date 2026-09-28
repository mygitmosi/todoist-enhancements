/**
 * A small Markdown renderer for task descriptions.
 *
 * Todoist descriptions are Markdown, and the reader should see the formatted
 * text rather than the syntax. Every input is HTML-escaped before any rule
 * runs, so the result can never carry markup that came from the source text.
 */

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Only http and https links become anchors; anything else stays plain text. */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * The endings common enough that a bare word before one reads as an address
 * — "free.fr", not "[free](https://free.fr)" — the way Todoist reads one
 * typed without `http://` in front of it.
 *
 * Short and unambiguous on purpose. A one-letter ending (`e.g.`, `U.S.`) or a
 * number (`3.5`) never matches: every entry here is at least two letters, and
 * the pattern below requires the ending to be letters only. Missing an
 * obscure country code is a smaller cost than turning "no. 12" into a link.
 */
const COMMON_TLDS = [
  'com', 'net', 'org', 'io', 'dev', 'app', 'co', 'me', 'info', 'biz', 'name',
  'pro', 'tv', 'cc', 'xyz', 'online', 'site', 'shop', 'tech', 'ai', 'gg', 'so',
  'edu', 'gov', 'fr', 'de', 'uk', 'us', 'ca', 'es', 'it', 'nl', 'be', 'ch',
  'eu', 'at', 'se', 'no', 'dk', 'fi', 'pl', 'cz', 'pt', 'ie', 'gr', 'ru',
  'jp', 'cn', 'kr', 'in', 'au', 'nz', 'br', 'mx', 'ar', 'za',
];

/** A label Todoist's own address rules allow: letters, digits and hyphens, never starting or ending on one. */
const DOMAIN_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?';

/**
 * A bare address with no scheme: one or more dotted labels ending on a known
 * TLD, an optional path. Never preceded by a word character, a dot or an
 * `@` — the domain half of an email address is not a link on its own.
 */
const BARE_DOMAIN = new RegExp(
  `(^|[\\s(])(?<![@.\\w])(${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})*\\.(?:${COMMON_TLDS.join('|')})(?:/[^\\s<>"')]*)?)\\b`,
  'gi',
);

/** Where a link sits in `text`, whichever of the three forms wrote it. */
export interface LinkSpan {
  start: number;
  end: number;
  href: string;
  /** The text as written — the label between brackets, or the address itself. */
  label: string;
}

/**
 * Every link `text` carries, in reading order: `[label](url)`, a bare
 * `http(s)://` address, or a bare domain such as `free.fr`. Shared by the
 * renderer below, `titleLinks`, and the composer's live mark while typing —
 * one reading of what counts as a link, used everywhere one is drawn.
 */
export function findLinks(text: string): LinkSpan[] {
  const found: LinkSpan[] = [];
  const claimed: Array<[number, number]> = [];
  const overlaps = (start: number, end: number) =>
    claimed.some(([a, b]) => start < b && end > a);
  const take = (start: number, end: number, href: string, label: string) => {
    if (overlaps(start, end)) return;
    claimed.push([start, end]);
    found.push({ start, end, href, label });
  };

  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const href = safeUrl(m[2]);
    if (href) take(m.index!, m.index! + m[0].length, href, m[1]);
  }
  for (const m of text.matchAll(/(^|[\s(])(https?:\/\/[^\s<>"')]+)/g)) {
    const start = m.index! + m[1].length;
    take(start, start + m[2].length, m[2], m[2]);
  }
  for (const m of text.matchAll(BARE_DOMAIN)) {
    const start = m.index! + m[1].length;
    take(start, start + m[2].length, `https://${m[2]}`, m[2]);
  }

  return found.sort((a, b) => a.start - b.start);
}

/** Stand-ins for the pieces lifted out while the other inline rules run. */
const CODE_SLOT = (index: number) => `@@code${index}@@`;
const LINK_SLOT = (index: number) => `@@link${index}@@`;

/** Emphasis, applied only to text that carries no generated markup. */
const emphasise = (text: string): string =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

export interface InlineOptions {
  /**
   * False renders a link as its label alone. A one-line preview lives inside
   * a button, and an anchor cannot legally sit there.
   */
  anchors?: boolean;
}

function inline(text: string, { anchors = true }: InlineOptions = {}): string {
  let out = escapeHtml(text);

  // Code spans are lifted out first so later rules cannot reach inside them.
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(code);
    return CODE_SLOT(codes.length - 1);
  });

  /* Links are lifted out for the same reason. A rendered anchor carries
     target="_blank", and leaving it in the string let the emphasis rules
     below pair that underscore with another one further along the line and
     tear the tag in half, which is what put raw attributes on screen. */
  const links: string[] = [];
  const slot = (html: string): string => {
    links.push(html);
    return LINK_SLOT(links.length - 1);
  };
  const link = (href: string, label: string): string =>
    anchors
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : `<span class="mdlink">${label}</span>`;

  /* `out` at this point is already HTML-escaped, and `findLinks` reads plain
     text — an escaped `&amp;` has different offsets than the `&` a link's
     span was measured against. Read the spans from the escaped string
     itself; escaping never turns a link's own characters into entities
     (`<`, `>`, `&`, `"`, `'` do not appear inside a URL or a plain-text
     address once Markdown's own `[label](url)` brackets are excluded from
     the label side by `findLinks`), so the offsets still line up. */
  const spans = findLinks(out);
  let cursor = 0;
  let marked = '';
  for (const span of spans) {
    marked += out.slice(cursor, span.start);
    // The bracket form's label reads its own emphasis; the other two show
    // the address exactly as typed — an underscore in one is not emphasis.
    const bracketed = out[span.start] === '[';
    marked += slot(link(span.href, bracketed ? emphasise(span.label) : span.label));
    cursor = span.end;
  }
  marked += out.slice(cursor);
  out = marked;

  out = emphasise(out);

  out = out.replace(/@@link(\d+)@@/g, (_match, index: string) => links[Number(index)]);
  out = out.replace(/@@code(\d+)@@/g, (_match, index: string) => `<code>${codes[Number(index)]}</code>`);
  return out;
}

/**
 * Renders one line of Markdown, inline rules only.
 *
 * A task row shows a single clamped line, so block structure — lists, code
 * fences, headings — has nowhere to go. Their markers are stripped and the
 * remaining lines joined, which is what a reader scanning the list wants:
 * emphasis and links formatted, syntax gone.
 */
export function renderInlineMarkdown(source: string, options?: InlineOptions): string {
  if (!source.trim()) return '';
  const line = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((raw) => raw.trim())
    .filter((raw) => raw !== '' && !raw.startsWith('```'))
    .map((raw) => raw
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/^>\s?/, ''))
    .join(' · ');
  return inline(line, options);
}

/**
 * Renders a task's title: Todoist titles take the inline Markdown a
 * description does — `[label](url)`, a bare address, bold, italic, code — and
 * its own app shows them formatted, with the links clickable (#101).
 */
export function renderTitle(content: string, options?: InlineOptions): string {
  return inline(content, options);
}

/**
 * A title as plain words, for the places that draw it as text (a breadcrumb,
 * a toast, a search result): a link reads as its label, and the emphasis
 * markers go, so none of them shows `[label](https://…)`.
 */
export function plainTitle(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\((?:[^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a?: string, b?: string) => a ?? b ?? '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

/** The links a title carries, labelled, in the order they are written. */
export function titleLinks(content: string): Array<{ label: string; href: string }> {
  return findLinks(content).map(({ label, href }) => ({ label, href }));
}

/** Renders a description to HTML that is safe to insert. */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return '';

  const blocks: string[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let paragraph: string[] = [];
  let inFence = false;
  let fence: string[] = [];

  const flushList = () => {
    if (listType && listItems.length > 0) {
      blocks.push(`<${listType}>${listItems.map((i) => `<li>${i}</li>`).join('')}</${listType}>`);
    }
    listType = null;
    listItems = [];
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.map((line) => inline(line)).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inFence) {
        blocks.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
        fence = [];
        inFence = false;
      } else {
        flushParagraph();
        flushList();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fence.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      // Descriptions sit inside a dialog, so headings start below its own h2.
      const level = Math.min(6, heading[1].length + 2);
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(inline(bullet[1]));
      continue;
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(inline(numbered[1]));
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (inFence && fence.length > 0) {
    blocks.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
  }
  flushParagraph();
  flushList();

  return blocks.join('');
}

/** A description reduced to one readable line, for previews in a list. */
export const plainPreview = (source: string): string =>
  source.replace(/[*_`~#>[\]]/g, '').replace(/\s+/g, ' ').trim();
