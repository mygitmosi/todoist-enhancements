import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';
import { AnchoredPanel } from '@/components/AnchoredPanel';
import { EditViewPanel, NewViewPanel } from '@/components/ViewPanel';
import { MODE_ICON } from '@/components/viewModes';
import { useT } from '@/hooks/useT';
import type { ProjectViewsApi } from '@/hooks/useProjectViews';
import type { ProjectViewTab } from '@/domain/projectViews';

/**
 * How many of the views fit on one line, measured on a hidden copy of the
 * row: the others go to a "+N" menu, and the view in front always keeps a
 * place, so it is never the one that is hidden.
 */
function useFit(tabs: ProjectViewTab[], activeId: string) {
  const measure = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(tabs.length);
  useLayoutEffect(() => {
    const row = measure.current;
    if (!row) return;
    const run = () => {
      const items = [...row.children] as HTMLElement[];
      if (items.length === 0) return;
      const first = items[0].offsetTop;
      const n = items.filter((item) => item.offsetTop <= first + 2).length;
      setCount((now) => (now === n ? now : n));
    };
    run();
    const watch = new ResizeObserver(run);
    watch.observe(row);
    return () => watch.disconnect();
  }, [tabs]);
  const fit = Math.min(count, tabs.length);
  let shown = tabs.slice(0, fit);
  let hidden = tabs.slice(fit);
  const active = tabs.find((tab) => tab.id === activeId);
  if (active && hidden.includes(active) && fit > 0) {
    hidden = [...hidden.filter((tab) => tab !== active), shown[fit - 1]];
    shown = [...shown.slice(0, fit - 1), active];
  }
  return { measure, shown, hidden };
}

/**
 * The saved views of a project, as a row of grey pills (#333). The icon of a
 * pill is its layout. A view is opened with a click, edited (its name included)
 * by pressing it again or with a right click or Shift+F10, and moved by
 * dragging it or with Alt+Shift and the arrows.
 */
export function ProjectViewTabs({ api }: { api: ProjectViewsApi }) {
  const { t } = useT();
  const [editing, setEditing] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [adding, setAdding] = useState<HTMLElement | null>(null);
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const fit = useFit(api.tabs, api.active.id);

  const focusTab = (id: string) => requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`[data-view-id="${id}"] [role="tab"]`)?.focus());

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, tab: ProjectViewTab, index: number) => {
    const list = [...(event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
    const at = list.indexOf(event.currentTarget);
    const arrow = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
    if (arrow && event.altKey && event.shiftKey) {
      event.preventDefault();
      api.move(tab.id, index + (event.key === 'ArrowRight' ? 1 : -1));
      focusTab(tab.id);
      return;
    }
    const to = event.key === 'ArrowRight' ? at + 1 : event.key === 'ArrowLeft' ? at - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : null;
    if (to !== null) {
      event.preventDefault();
      const next = list[(to + list.length) % list.length];
      next?.focus();
      const id = next?.closest<HTMLElement>('[data-view-id]')?.dataset.viewId;
      if (id) api.select(id);
    } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      setEditing({ id: tab.id, anchor: event.currentTarget.closest<HTMLElement>('[data-view-id]') ?? event.currentTarget });
    }
  };

  const pill = (tab: ProjectViewTab, index: number, measuring = false) => {
    const on = tab.id === api.active.id;
    const open = !measuring && editing?.id === tab.id;
    const mode = api.modeOf(tab.id);
    const icon = <Icon name={MODE_ICON[mode]} size="sm" />;
    return (
      <span
        key={tab.id}
        className={`vtab${on ? ' on' : ''}${open ? ' open' : ''}${dragging && dragging !== tab.id ? ' droppable' : ''}`}
        data-view-id={measuring ? undefined : tab.id}
        draggable={!measuring}
        onDragStart={(event) => { event.dataTransfer.setData('text/plain', tab.id); event.dataTransfer.effectAllowed = 'move'; setDragging(tab.id); }}
        onDragEnd={() => setDragging(null)}
        onDragOver={(event) => { if (dragging) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (dragging) api.move(dragging, index); setDragging(null); }}
      >
        {measuring ? (
          <span className="vtab-main">{icon}<span className="vtab-name">{tab.name}</span></span>
        ) : (
          <button
            type="button" role="tab" className="vtab-main" aria-selected={on} tabIndex={on ? 0 : -1} title={tab.name}
            aria-haspopup={on ? 'dialog' : undefined} aria-expanded={on ? open : undefined}
            onClick={(event) => {
              if (!on) { api.select(tab.id); return; }
              /* Pressing the view in front opens what it is made of. */
              const anchor = event.currentTarget.closest<HTMLElement>('[data-view-id]') ?? event.currentTarget;
              setEditing(open ? null : { id: tab.id, anchor });
            }}
            onContextMenu={(event) => { event.preventDefault(); setEditing({ id: tab.id, anchor: event.currentTarget.closest<HTMLElement>('[data-view-id]') ?? event.currentTarget }); }}
            onKeyDown={(event) => onKey(event, tab, index)}
          >
            {icon}<span className="vtab-name">{tab.name}</span>
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="vtabs">
      <div className="vtabs-row">
        <div role="tablist" aria-label={t('views.label')} className="vtabs-list">
          {fit.shown.map((tab) => pill(tab, api.tabs.indexOf(tab)))}
        </div>
        {fit.hidden.length > 0 && (
          <button
            type="button" className={`vtabs-over${fit.hidden.some((tab) => tab.id === api.active.id) ? ' on' : ''}`}
            aria-haspopup="menu" aria-expanded={more !== null} aria-label={`${t('views.more')} (${fit.hidden.length})`}
            onClick={(event) => setMore(more ? null : event.currentTarget)}
          >
            +{fit.hidden.length}<Icon name="caret" size="sm" />
          </button>
        )}
        <button
          type="button" className={`vtabs-add${adding ? ' open' : ''}`} aria-label={t('views.add')} title={api.full ? t('views.limit', { count: api.tabs.length }) : t('views.add')}
          aria-haspopup="dialog" aria-expanded={adding !== null} disabled={api.full}
          onClick={(event) => setAdding(adding ? null : event.currentTarget)}
        >
          <Icon name="plus" size="sm" />
        </button>
        <div className="vtabs-measure" aria-hidden="true" ref={fit.measure}>
          {api.tabs.map((tab) => pill(tab, 0, true))}
        </div>
      </div>

      {more && (
        <AnchoredPanel anchor={more} onClose={() => setMore(null)} label={t('views.more')} className="viewmenu">
          <div className="viewmenu-list" role="menu">
            {fit.hidden.map((tab) => (
              <button key={tab.id} type="button" role="menuitem" className={tab.id === api.active.id ? 'on' : ''}
                onClick={() => { api.select(tab.id); setMore(null); }}>
                <Icon name={MODE_ICON[api.modeOf(tab.id)]} size="sm" /><span>{tab.name}</span>
              </button>
            ))}
          </div>
        </AnchoredPanel>
      )}
      {adding && <NewViewPanel api={api} anchor={adding} onClose={() => setAdding(null)} />}
      {editing && <EditViewPanel key={editing.id} api={api} id={editing.id} anchor={editing.anchor} onClose={() => setEditing(null)} />}
    </div>
  );
}
