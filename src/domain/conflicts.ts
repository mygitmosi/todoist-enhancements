import { SYSTEM_LABELS, estimateStorage, weekLabel, type Item } from './types';
import { readEstimate, estimateOf, childrenSum } from './estimates';
import { hasLabel, QUICK_THRESHOLD_MINUTES } from './views';

/**
 * The centre for things to settle, split in two as the spec requires.
 *
 * "To complete" holds tasks missing an estimate. Those are not errors and are
 * never presented as such. "Conflicts" holds contradictions inside a task
 * itself. Nothing here is ever corrected silently: every conflict is offered to
 * the user with the choices that match the possible intents.
 */

export type ConflictKind =
  | 'estimate-mismatch'
  | 'multiple-estimates'
  | 'invalid-estimate'
  | 'date-and-week'
  | 'quick-too-long'
  | 'parent-and-children-estimated';

export interface ConflictOption {
  /** Identifies the fix; the store maps this to the matching Todoist command. */
  id: string;
  /** Translation key for the button label. */
  labelKey: string;
  /** Free-form values the resolver needs, such as which estimate to keep. */
  payload?: Record<string, unknown>;
  recommended?: boolean;
}

export interface Conflict {
  id: string;
  kind: ConflictKind;
  itemId: string;
  /** Translation key for the sentence explaining the contradiction. */
  messageKey: string;
  /** Values interpolated into that sentence. */
  messageValues?: Record<string, string | number>;
  options: ConflictOption[];
}

export interface ConflictSettings {
  estimateMismatch: boolean;
  dateAndWeek: boolean;
  multipleEstimates: boolean;
  quickTooLong: boolean;
  parentAndChildren: boolean;
  invalidEstimate: boolean;
}

export const defaultConflictSettings = (): ConflictSettings => ({
  estimateMismatch: true,
  dateAndWeek: true,
  multipleEstimates: true,
  quickTooLong: true,
  parentAndChildren: true,
  invalidEstimate: true,
});

export function detectConflicts(
  items: Item[],
  childrenOf: (parentId: string) => Item[],
  settings: ConflictSettings = defaultConflictSettings(),
): Conflict[] {
  const out: Conflict[] = [];

  for (const item of items) {
    const reading = readEstimate(item);
    if (settings.estimateMismatch && estimateStorage() === 'duration' && reading.mismatch && !reading.multiple && !reading.invalid) {
      out.push({
        id: `${item.id}:estimate-mismatch`, kind: 'estimate-mismatch', itemId: item.id,
        messageKey: 'estimates.mismatch',
        messageValues: { duration: reading.durationMinutes!, tag: reading.tagMinutes! },
        options: [
          { id: 'keep-duration', labelKey: 'estimates.keepDuration', recommended: true },
          { id: 'keep-tag', labelKey: item.due?.date.includes('T') ? 'estimates.keepTagTimed' : 'estimates.keepTag' },
        ],
      });
    }

    if (settings.multipleEstimates && reading.multiple) {
      out.push({
        id: `${item.id}:multiple-estimates`,
        kind: 'multiple-estimates',
        itemId: item.id,
        messageKey: 'conflict.multipleEstimates',
        options: reading.raw.map((label, index) => ({
          id: `keep:${label}`,
          labelKey: 'conflict.keepEstimate',
          payload: { label },
          recommended: index === 0,
        })),
      });
    }

    if (settings.invalidEstimate && reading.invalid && !reading.multiple) {
      out.push({
        id: `${item.id}:invalid-estimate`,
        kind: 'invalid-estimate',
        itemId: item.id,
        messageKey: 'conflict.invalidEstimate',
        messageValues: { label: reading.raw[0] ?? '' },
        options: [
          { id: 'edit-estimate', labelKey: 'conflict.editEstimate', recommended: true },
          { id: 'remove-estimate', labelKey: 'conflict.removeEstimate' },
        ],
      });
    }

    if (settings.dateAndWeek && item.due && hasLabel(item, weekLabel())) {
      out.push({
        id: `${item.id}:date-and-week`,
        kind: 'date-and-week',
        itemId: item.id,
        messageKey: 'conflict.dateAndWeek',
        options: [
          { id: 'remove-week-label', labelKey: 'conflict.removeLabel', recommended: true },
          { id: 'remove-date', labelKey: 'conflict.removeDate' },
        ],
      });
    }

    if (settings.quickTooLong && hasLabel(item, SYSTEM_LABELS.quick)) {
      const est = estimateOf(item);
      if (est !== null && est > QUICK_THRESHOLD_MINUTES) {
        out.push({
          id: `${item.id}:quick-too-long`,
          kind: 'quick-too-long',
          itemId: item.id,
          messageKey: 'conflict.quickTooLong',
          messageValues: { minutes: est },
          options: [
            { id: 'remove-quick-label', labelKey: 'conflict.removeQuick', recommended: true },
            { id: 'dismiss', labelKey: 'conflict.keepBoth' },
          ],
        });
      }
    }

    /* When every open subtask has an estimate their sum wins and is written to
       the parent (#187), so there is nothing left to choose between. */
    if (settings.parentAndChildren && estimateOf(item) !== null && childrenSum(item, childrenOf) === null) {
      const estimatedChildren = childrenOf(item.id).filter(
        (c) => !c.checked && !c.is_deleted && estimateOf(c) !== null,
      );
      if (estimatedChildren.length > 0) {
        const childSum = estimatedChildren.reduce((acc, c) => acc + (estimateOf(c) ?? 0), 0);
        out.push({
          id: `${item.id}:parent-and-children-estimated`,
          kind: 'parent-and-children-estimated',
          itemId: item.id,
          messageKey: 'conflict.parentAndChildren',
          messageValues: { parent: estimateOf(item)!, children: childSum },
          options: [
            { id: 'keep-parent', labelKey: 'conflict.keepParentEstimate', recommended: true },
            { id: 'clear-parent', labelKey: 'conflict.useChildrenSum' },
            { id: 'dismiss', labelKey: 'conflict.keepBoth' },
          ],
        });
      }
    }
  }

  return out;
}

/** Tasks with no estimate. Listed for completion, never flagged as errors. */
export function detectIncomplete(items: Item[]): Item[] {
  return items.filter((i) => estimateOf(i) === null);
}
