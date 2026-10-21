import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TaskGroup } from './TaskGroup';
import { TableContext } from './TableContext';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { sortItems } from '@/store/selectors';
import { viewPrefs } from '@/store/prefs';
import { tableColumns, tableColumnLabel, tableColumnSort } from '@/domain/table';
import { effectiveEstimate, formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import type { TaskGroupProps } from './TaskGroup';

export function TableSurface({ groups, viewKey, childrenOf, onOpen }: {
  groups: Array<TaskGroupProps>; viewKey: string; childrenOf: (id: string) => Item[]; onOpen: (id: string) => void;
}) {
  const { t, locale } = useT();
  const prefs = useStore((s) => s.prefs);
  const snapshot = useStore((s) => s.snapshot);
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const current = viewPrefs(prefs, viewKey);
  const columns = tableColumns(current);
  const widths = columns.slice(1).map((column) => column === 'description' ? '240px' : column === 'labels' || column === 'project' ? '160px' : column === 'date' ? '140px' : column === 'deadline' ? '130px' : '110px');
  const scrollRef = useRef<HTMLDivElement>(null);
  /* The table scrolls inside itself, so the header row stays in view: it is
     given the height left under it in the window, measured again whenever the
     window or the page above it changes size. */
  const [room, setRoom] = useState<number | null>(null);
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const measure = () => setRoom(Math.max(240, Math.floor(window.innerHeight - box.getBoundingClientRect().top - 16)));
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (box.parentElement) observer.observe(box.parentElement);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, []);
  const all = [...new Map(groups.flatMap((group) => group.items).map((item) => [item.id, item])).values()];
  const total = all.reduce((sum, item) => sum + (effectiveEstimate(item, childrenOf).minutes ?? 0), 0);
  return <TableContext.Provider value={{ columns, coloration: current.tableColoration ?? 'none' }}>
    <div ref={scrollRef} className="table-scroll fullwidth"
      style={room ? { maxHeight: room } : undefined}>
      <div className="task-table" style={{ '--table-columns': `18px minmax(var(--table-title-min,240px),var(--table-title-max,1fr)) ${widths.join(' ')}`, minWidth: 372 + widths.reduce((sum, width) => sum + parseInt(width), 0) } as CSSProperties}>
        <div className="table-head">{columns.map((column) => <div key={column} aria-sort={tableColumnSort[column] === current.sort ? current.tableDescending ? 'descending' : 'ascending' : 'none'}>
          <button onClick={() => setViewPrefs(viewKey, { sort: tableColumnSort[column],
            tableDescending: current.sort === tableColumnSort[column] ? !current.tableDescending : false })}>
            {t(tableColumnLabel[column])}{tableColumnSort[column] === current.sort ? current.tableDescending ? ' ↓' : ' ↑' : ''}
          </button></div>)}</div>
        {groups.map((group, index) => {
          const sorted = sortItems(group.items, current.sort, childrenOf, group.reorderable || 'project', snapshot);
          return <TaskGroup key={group.sectionId ?? group.title ?? index} {...group} viewKey={viewKey}
            items={current.tableDescending ? sorted.reverse() : sorted} childrenOf={childrenOf} onOpen={onOpen} keepWhenEmpty />;
        })}
        <footer className="table-footer">{t('metrics.tasks', { count: all.length })} · {formatDuration(total, locale)}</footer>
      </div>
    </div>
  </TableContext.Provider>;
}
