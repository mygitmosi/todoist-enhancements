/** An explicit time span owns both its start time and its estimate. */
export function readClockRange(raw: string) {
  const clock = '(\\d{1,2})\\s*(?:h|:)([0-5]\\d)?';
  const pattern = new RegExp(`\\b(?:de|from)\\s+${clock}\\s*(?:à|a|to)\\s+${clock}(?![\\p{L}\\p{N}_])`, 'giu');
  let result: { index: number; length: number; start: number; minutes: number } | null = null;
  for (const match of raw.matchAll(pattern)) {
    const firstHour = Number(match[1]), lastHour = Number(match[3]);
    if (firstHour > 23 || lastHour > 23) continue;
    const start = firstHour * 60 + Number(match[2] ?? 0), end = lastHour * 60 + Number(match[4] ?? 0);
    if (start === end) continue;
    result = { index: match.index!, length: match[0].length, start, minutes: (end - start + 1440) % 1440 };
  }
  return result;
}
