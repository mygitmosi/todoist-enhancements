/**
 * How far along something is, drawn: a ring with a wedge filled clockwise from
 * 12 o'clock, empty at none and a full disc at all (#156).
 *
 * Always next to the number it draws ("1/3"), never instead of it, so it is
 * decorative to a screen reader and the shape is never the only carrier of the
 * information. It takes the icon's box (`.ic`), so it sits wherever the
 * subtask icon it replaced did without moving the line, and paints in
 * `currentColor`: muted while in progress, the success colour once complete.
 * Kept out of the `Icon` catalogue on purpose, since the checklist (#157)
 * reuses it with its own colour.
 */
export function ProgressRing({ done, total, size, className }: {
  done: number;
  total: number;
  size?: 'sm';
  className?: string;
}) {
  if (total <= 0) return null;
  const ratio = Math.min(1, Math.max(0, done / total));
  const complete = ratio === 1;
  const classes = ['ic', size === 'sm' ? 'ic-sm' : '', 'progressring', complete ? 'complete' : '', className ?? '']
    .filter(Boolean).join(' ');
  return (
    <svg className={classes} viewBox="0 0 16 16" aria-hidden="true" data-progress={`${done}/${total}`}>
      <circle cx="8" cy="8" r="6.75" strokeWidth="1.5" />
      {complete ? (
        <circle cx="8" cy="8" r="6.75" fill="currentColor" stroke="none" />
      ) : ratio > 0 ? (
        <path d={wedge(ratio)} fill="currentColor" stroke="none" />
      ) : null}
    </svg>
  );
}

/** A pie slice of the ring's radius, from 12 o'clock clockwise. */
export function wedge(ratio: number, cx = 8, cy = 8, r = 6.75): string {
  const angle = ratio * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  const large = ratio > 0.5 ? 1 : 0;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return `M${cx} ${cy}L${cx} ${round(cy - r)}A${r} ${r} 0 ${large} 1 ${round(x)} ${round(y)}Z`;
}
