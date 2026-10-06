import type { EstimateStorage, Item } from './types';
import { durationMinutes, estimatePatch, readEstimate } from './estimates';

export type ConversionSkip = 'invalid' | 'different' | 'days';
export interface EstimateConversion {
  changes: Array<{ item: Item; patch: Partial<Pick<Item, 'labels' | 'duration'>>; minutes: number }>;
  skipped: Array<{ item: Item; reason: ConversionSkip }>;
  timed: number;
}
/** A preview only. No account labels, dates or completed tasks are touched. */
export function planEstimateConversion(items: Item[], target: EstimateStorage): EstimateConversion {
  const plan: EstimateConversion = { changes: [], skipped: [], timed: 0 };
  for (const item of items) {
    if (item.checked || item.is_deleted) continue;
    const reading = readEstimate(item);
    const minutes = target === 'duration' ? reading.tagMinutes : durationMinutes(item.duration);
    if (target === 'duration' ? reading.raw.length === 0 : !item.duration) continue;
    const reason: ConversionSkip | null = reading.multiple || reading.invalid ? 'invalid'
      : item.duration?.unit === 'day' ? 'days'
      : reading.mismatch ? 'different' : null;
    if (reason) { plan.skipped.push({ item, reason }); continue; }
    if (minutes === null) continue;
    const timed = Boolean(item.due?.date.includes('T'));
    if (target === 'tag' && reading.tagMinutes === minutes && (timed || !item.duration)) continue;
    const patch = estimatePatch(item, minutes, target);
    if (target === 'tag' && !timed) patch.duration = null;
    plan.changes.push({ item, patch, minutes });
    if (timed) plan.timed++;
  }
  return plan;
}
