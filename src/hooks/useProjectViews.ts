import { useCallback, useMemo } from 'react';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { useT } from '@/hooks/useT';
import {
  MAIN_VIEW, MAX_VIEWS, activeTab, cloneSettings, moveTab, neighbourAfterDelete, newViewId, tabsOf, uniqueName,
  viewKeyOf, withoutTab, type ProjectViewTab,
} from '@/domain/projectViews';
import { defaultViewPrefs, type DisplayMode, type ViewPrefs } from '@/domain/types';


/** The key a project page reads its display settings under: its active view's (#333). */
export function useActiveViewKey(projectId: string): string {
  const { t } = useT();
  const stored = useStore((s) => s.prefs.projectViews[projectId]);
  const activeId = useStore((s) => s.prefs.activeViews[projectId]);
  const tabs = useMemo(() => tabsOf(stored, t('views.default')), [stored, t]);
  return viewKeyOf(projectId, activeTab(tabs, activeId).id);
}

/** The saved views of a project, and everything that can be done to them. */
export function useProjectViews(projectId: string) {
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const stored = prefs.projectViews[projectId];
  const tabs = useMemo(() => tabsOf(stored, t('views.default')), [stored, t]);
  const active = activeTab(tabs, prefs.activeViews[projectId]);
  const keyOf = useCallback((id: string) => viewKeyOf(projectId, id), [projectId]);
  const modeOf = (id: string): DisplayMode => viewPrefs(prefs, keyOf(id)).mode;
  const store = () => useStore.getState();
  const persist = (next: ProjectViewTab[]) => store().setProjectViews(projectId, next);

  const select = (id: string) => store().setActiveView(projectId, id);

  /** Makes a view with these settings and opens it; null when the project is full. */
  const add = (name: string, settings: Partial<ViewPrefs>): string | null => {
    if (tabs.length >= MAX_VIEWS) return null;
    const id = newViewId(tabs);
    store().setViewPrefs(keyOf(id), cloneSettings({ ...defaultViewPrefs(keyOf(id)), ...settings }));
    persist([...tabs, { id, name: uniqueName(tabs, name, t('views.panel')) }]);
    select(id);
    return id;
  };

  const rename = (id: string, name: string) => {
    const next = uniqueName(tabs, name, t('views.panel'), id);
    persist(tabs.map((tab) => (tab.id === id ? { ...tab, name: next } : tab)));
  };

  const duplicate = (id: string): string | null => {
    if (tabs.length >= MAX_VIEWS) return null;
    const copy = newViewId(tabs);
    const from = tabs.find((tab) => tab.id === id);
    store().setViewPrefs(keyOf(copy), cloneSettings(viewPrefs(store().prefs, keyOf(id))));
    const at = tabs.findIndex((tab) => tab.id === id);
    const next = [...tabs];
    next.splice(at + 1, 0, { id: copy, name: uniqueName(tabs, t('views.duplicateName', { name: from?.name ?? '' }), t('views.panel')) });
    persist(next);
    select(copy);
    return copy;
  };

  const remove = (id: string) => {
    if (tabs.length < 2) return;
    const open = active.id === id ? neighbourAfterDelete(tabs, id) : undefined;
    persist(withoutTab(tabs, id));
    store().removeViewPrefs([keyOf(id)]);
    if (open) select(open);
  };

  const move = (id: string, to: number) => persist(moveTab(tabs, id, to));

  const setMode = (id: string, mode: DisplayMode) => store().setViewPrefs(keyOf(id), { mode });

  /** Back to how a view starts: no grouping, the default sort, no filters. The layout stays. */
  const reset = (id: string) => {
    const base = defaultViewPrefs(keyOf(id));
    store().setViewPrefs(keyOf(id), { group: base.group, sort: base.sort, filters: base.filters });
  };

  return { tabs, active, activeKey: keyOf(active.id), keyOf, modeOf, select, add, rename, duplicate, remove, move, setMode, reset, full: tabs.length >= MAX_VIEWS, isMain: (id: string) => id === MAIN_VIEW };
}

export type ProjectViewsApi = ReturnType<typeof useProjectViews>;
