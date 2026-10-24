/**
 * Mentions in comments (#254), written the way Todoist writes them.
 *
 * Read on a test account from a comment posted in Todoist's own app: a
 * mention is a Markdown link to `todoist-mention://<user id>`, with the name
 * as its label — `[Alex M](todoist-mention://123)`. Who is notified is not
 * read from the text: the comment carries its own `uids_to_notify`, which
 * Todoist delivers (checked from a second account).
 */

const MENTION = /\[([^\]\n]+)\]\(todoist-mention:\/\/([\w-]+)\)/g;

export const mentionMarkdown = (name: string, uid: string): string =>
  `[${name.replace(/[[\]]/g, '')}](todoist-mention://${uid})`;

/** The people a comment's text mentions, each once, in order. */
export function mentionedUids(content: string): string[] {
  return [...new Set([...content.matchAll(MENTION)].map((m) => m[2]))];
}

/**
 * The "@…" being typed right before the caret, if any. An @ only starts a
 * mention at the start of the text or after a space, so an e-mail address
 * ("anne@example.com") is never taken for one.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]{0,40})$/.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

/**
 * Turns what the field shows ("@Alex M") into what Todoist stores, for the
 * people picked from the list while typing. A name typed by hand without
 * picking it stays plain text.
 */
export function encodeMentions(text: string, picked: Array<{ id: string; name: string }>): string {
  let out = text;
  for (const person of [...picked].sort((a, b) => b.name.length - a.name.length)) {
    out = out.split(`@${person.name}`).join(mentionMarkdown(person.name, person.id));
  }
  return out;
}

const SLOT = (n: number) => `${n}`;
const SLOTS = /(\d+)/g;
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Renders a comment with its mentions as chips. The mentions are lifted out
 * before the Markdown is rendered (it would show them as raw links) and put
 * back as `<span class="mention">` afterwards.
 */
export function renderWithMentions(content: string, render: (source: string) => string): string {
  const names: string[] = [];
  const lifted = content.replace(MENTION, (_all, name: string) => { names.push(name); return SLOT(names.length - 1); });
  return render(lifted).replace(SLOTS, (_all, n: string) => `<span class="mention">@${escape(names[Number(n)] ?? '')}</span>`);
}
