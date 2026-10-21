import { useEffect, useState } from 'react';
import { endOfDay } from 'date-fns';
import { fetchCompleted } from '@/api/completed';
import { itemFromCompleted } from '@/api/tasks';
import { buildDemoCompleted } from '@/demo/demoData';
import { toApiDate } from '@/domain/dates';
import { useStore } from '@/store/store';
import type { Item } from '@/domain/types';

const NONE: Item[] = [];

/** History has completion dates, not reliable scheduled dates. Historical
 * entries are therefore shown on their completion day, explicitly labelled. */
export function useCalendarHistory(first: Date, last: Date, enabled: boolean, projectId?: string) {
  const connected = useStore((s) => s.connected);
  const demo = useStore((s) => s.demo);
  const locale = useStore((s) => s.prefs.locale);
  const owner = useStore((s) => s.snapshot.user?.id);
  const since = first.getTime(), until = endOfDay(last).getTime();
  const key = `${owner}:${projectId}:${since}:${until}`;
  const [loaded, setLoaded] = useState<{ key: string; items: Item[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !connected) return;
    const controller = new AbortController();
    const read = demo ? Promise.resolve(buildDemoCompleted(locale))
      : fetchCompleted(new Date(since), new Date(until), controller.signal, projectId ? { project_id: projectId } : {});
    void read.then((entries) => {
      if (controller.signal.aborted) return;
      const items = entries.filter((entry) => {
        const time = new Date(entry.completed_at).getTime();
        return time >= since && time <= until && (!projectId || entry.project_id === projectId);
      }).map((entry) => ({ ...itemFromCompleted(entry), id: `calendar-done:${entry.task_id ?? entry.id}:${entry.completed_at}`,
        due: { date: toApiDate(new Date(entry.completed_at)), string: '', timezone: null, lang: locale, is_recurring: false } }));
      setFailed(null);
      setLoaded({ key, items });
    }).catch(() => { if (!controller.signal.aborted) setFailed(key); });
    return () => controller.abort();
  }, [key, since, until, projectId, connected, demo, enabled, locale]);
  return { items: enabled && loaded?.key === key ? loaded.items : NONE, error: enabled && failed === key };
}
