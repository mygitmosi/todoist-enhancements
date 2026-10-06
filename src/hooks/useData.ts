import { useMemo } from 'react';
import { useStore } from '@/store/store';
import { childIndex, makeChildrenOf, openItems } from '@/store/selectors';
import type { Item } from '@/domain/types';

/**
 * The derived reading of the snapshot every view needs: the open tasks, and a
 * way to reach a task's children. Recomputed only when the snapshot changes.
 */
export function useData() {
  const storage = useStore((s) => s.prefs.estimateStorage);
  const snapshot = useStore((s) => s.snapshot);

  return useMemo(() => {
    void storage; // Changing precedence invalidates derived totals and groups.
    const index = childIndex(snapshot);
    const childrenOf = makeChildrenOf(index);
    const items = openItems(snapshot);
    const byId = (id: string): Item | undefined => snapshot.items[id];
    return { snapshot, items, childrenOf, byId, childIndex: index };
  }, [snapshot, storage]);
}
