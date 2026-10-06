import { useState } from 'react';
import { useStore } from '@/store/store';

/** Shared creation rule for task pickers, bulk selection and filters. */
export function useCreateTag(query: string) {
  const labels = useStore((s) => s.snapshot.labels);
  const createLabel = useStore((s) => s.createLabel);
  const [busy, setBusy] = useState(false);
  const name = query.trim().replace(/\s+/g, '-');
  const available = Boolean(name && !Object.values(labels).some((label) => !label.is_deleted && label.name.toLowerCase() === name.toLowerCase()));
  async function create(): Promise<string | null> {
    if (!available || busy) return null;
    setBusy(true);
    try {
      await createLabel(name);
      return Object.values(useStore.getState().snapshot.labels).find((label) => !label.is_deleted && label.name.toLowerCase() === name.toLowerCase())?.name ?? null;
    } finally { setBusy(false); }
  }
  return { name, available, busy, create };
}
