import type { Item } from './types';

/** A comma-separated list owns its own matches, including its subtask hierarchy. */
export function filterRoots(ids: string[], items: Record<string, Item>): Item[] {
  const matches = [...new Set(ids)].map((id) => items[id])
    .filter((item): item is Item => Boolean(item) && !item.checked && !item.is_deleted);
  const present = new Set(matches.map((item) => item.id));
  return matches.filter((item) => !item.parent_id || !present.has(item.parent_id));
}
