/**
 * A list pasted into the new task window, read as one task per line (#152).
 *
 * Returns the titles in the order they were pasted, or null when the text is
 * not a list: fewer than two non-empty lines is an ordinary paste, and the
 * field keeps its usual behaviour for it.
 *
 * Only a real list prefix comes off a line: a bullet (`-`, `*`, `•`, `–`, `·`,
 * `▪`, `◦`) followed by a space, with or without a Markdown task box after it
 * (`- [ ] `, `- [x] `). A dash or an asterisk that belongs to the title, `-5
 * degrees` or `*important*`, has no space after it and stays. Blank lines and
 * surrounding spaces are ignored (a line that is only a bullet is blank), and
 * nothing else is rewritten.
 */
const BULLET = /^[-*•–·▪◦](?:\s+(?:\[[ xX]\](?:\s+|$))?|$)/u;

export function splitPastedList(text: string): string[] | null {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim().replace(BULLET, '').trim())
    .filter((line) => line.length > 0);
  return lines.length >= 2 ? lines : null;
}
