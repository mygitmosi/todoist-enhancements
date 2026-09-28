import { useEffect, useMemo, useRef, useState } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { TaskGroup } from './TaskGroup';
import { Icon } from './Icon';
import { DraggableTask } from './dnd/DraggableTask';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import type { DisplayMode, GroupKey, Item, SortKey } from '@/domain/types';
import { groupItems, sortItems } from '@/store/selectors';
import { formatRelativeDay } from '@/domain/dates';
import { differenceInCalendarWeeks } from 'date-fns';
import { formatDuration } from '@/domain/estimates';
import { summariseLoad } from '@/domain/load';
import { Droppable } from './dnd/Droppable';
import type { DropTarget, RowOrder } from '@/domain/dnd';
import type { TranslationKey } from '@/i18n';

interface ModeSurfaceProps {
  items: Item[];
  childrenOf: (id: string) => Item[];
  mode: DisplayMode;
  group: GroupKey;
  sort: SortKey;
  onOpen: (id: string) => void;
  showProject?: boolean;
  /**
   * What a column of the current grouping means as a place to add a task,
   * where it means anything: a project column is a project, a tag column is a
   * tag, a priority column is not a place and gets no line. The page decides,
   * because only the page knows what it grouped.
   */
  addToGroup?: (groupKey: string) => (() => void) | undefined;
  /** Which of Todoist's orders "manual" reads here; a week reads the other one. */
  order?: RowOrder;
  /** Board columns come from sections when a project supplies them. */
  boardColumns?: Array<{
    id: string;
    title: string;
    items: Item[];
    dropTarget?: DropTarget;
    /** Adds a task straight into this column, from the end of it. */
    onAddTask?: () => void;
    /** A day column knows its capacity, and shows its load against it. */
    capacityMinutes?: number | null;
  }>;
}

/**
 * Renders the same set of tasks the way the current mode asks for.
 *
 * List is the mode for scanning and administering, Board shows columns, and
 * Calendar places dated work on a month grid. A task carries the same
 * information and the same hover controls in every one of them.
 */
export function ModeSurface(props: ModeSurfaceProps) {
  const { mode } = props;
  if (mode === 'board') return <BoardSurface {...props} />;
  return <ListSurface {...props} />;
}

function useGrouped(props: ModeSurfaceProps) {
  const { t, locale } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const { items, group, sort, childrenOf, order } = props;

  return useMemo(() => {
    const sorted = sortItems(items, sort, childrenOf, order, snapshot);
    return groupItems(sorted, group, snapshot, {
      none: t('common.none'),
      noProject: t('nav.inbox'),
      noSection: t('group.noSection'),
      noEstimate: t('metrics.noEstimates'),
      noLabel: t('common.none'),
      priority: (p) => t(`common.p${p}` as TranslationKey),
      day: (d) => (d ? formatRelativeDay(d, locale) : t('common.none')),
      week: (monday) => {
        const weeks = differenceInCalendarWeeks(monday, new Date(), { weekStartsOn: 1 });
        if (weeks === 0) return t('group.thisWeek');
        if (weeks === 1) return t('date.nextWeek');
        return t('group.weekOf', {
          date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(monday),
        });
      },
      month: (first) => {
        const name = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first);
        return name.charAt(0).toUpperCase() + name.slice(1);
      },
      scheduled: t('section.scheduled'),
      available: t('section.available'),
    });
  }, [items, group, sort, childrenOf, order, snapshot, t, locale]);
}

function ListSurface(props: ModeSurfaceProps) {
  const { t } = useT();
  const groups = useGrouped(props);

  if (props.items.length === 0) {
    return <p className="empty">{t('task.noTasks')}</p>;
  }

  return (
    <div className="mode">
      {groups.map((group) => (
        <TaskGroup
          key={group.key}
          title={group.title || undefined}
          items={group.items}
          childrenOf={props.childrenOf}
          onOpen={props.onOpen}
          showProject={props.showProject}
          onAddTask={props.addToGroup?.(group.key)}
        />
      ))}
    </div>
  );
}

/** A column is never narrower than this: below it a title stops being readable. */
const COLUMN_MIN = 272;
/** Nor wider than this, past which a column stops reading as a column. */
const COLUMN_MAX = 420;
/** How close to the board's edge a held card has to be to turn the page. */
const EDGE_ZONE = 48;
/** How long it is held there before the first turn, and between the next ones. */
const EDGE_DWELL_MS = 450;
const EDGE_REPEAT_MS = 900;

const columnGap = (board: HTMLElement): number =>
  parseFloat(getComputedStyle(board).columnGap || '16') || 16;

function BoardSurface(props: ModeSurfaceProps) {
  const { t, locale } = useT();
  const groups = useGrouped(props);
  // Columns derived from a grouping are not drop destinations: dropping onto
  // "priority" or "tag" has no single unambiguous meaning.
  const columns: NonNullable<ModeSurfaceProps['boardColumns']> =
    props.boardColumns ??
    groups.map((g) => ({ id: g.key, title: g.title || t('common.all'), items: g.items }));

  const boardRef = useRef<HTMLDivElement>(null);
  const [reach, setReach] = useState({ left: false, right: false });
  /* How many columns make a page, and how wide each one is so that exactly
     that many fill the board: no column is ever half on screen (#99). */
  const [page, setPage] = useState<{ count: number; width: number } | null>(null);

  /* The arrows are shown only when the board actually overflows, and each
     one goes dark at its end. Measured from the scroll position rather than
     counted, because how many columns fit depends on the window. */
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const gap = columnGap(board);
      const available = board.clientWidth;
      const fit = Math.max(1, Math.floor((available + gap) / (COLUMN_MIN + gap)));
      const count = Math.min(fit, columns.length);
      const width = Math.min(COLUMN_MAX, (available - (count - 1) * gap) / count);
      setPage((was) => (was?.count === count && Math.abs(was.width - width) < 0.5 ? was : { count, width }));
      const max = board.scrollWidth - board.clientWidth;
      setReach({ left: board.scrollLeft > 1, right: board.scrollLeft < max - 1 });
    };
    measure();
    board.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => {
      board.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [columns.length]);

  /** Turns a whole page: the next columns take exactly the place of these. */
  const step = (direction: -1 | 1) => {
    const board = boardRef.current;
    if (!board || !page) return;
    const stride = page.width + columnGap(board);
    const at = Math.round(board.scrollLeft / stride);
    board.scrollTo({ left: (at + direction * page.count) * stride, behavior: 'smooth' });
  };

  /* A card held at the board's edge turns the page, once, then again every
     so often while it stays there — the drag's own way to reach a column
     that is not on screen, at a pace a drop can still be aimed at. */
  const edgeTimer = useRef<number | null>(null);
  const edgeSide = useRef<-1 | 0 | 1>(0);
  const stopTurning = () => {
    if (edgeTimer.current !== null) window.clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
    edgeSide.current = 0;
  };
  const stepRef = useRef(step);
  stepRef.current = step;
  useDndMonitor({
    onDragMove(event) {
      const board = boardRef.current;
      const start = event.activatorEvent as PointerEvent | null;
      if (!board || !start || typeof start.clientX !== 'number') return;
      const x = start.clientX + event.delta.x;
      const y = start.clientY + event.delta.y;
      const rect = board.getBoundingClientRect();
      const inside = y >= rect.top && y <= rect.bottom;
      const side: -1 | 0 | 1 = !inside ? 0
        : x <= rect.left + EDGE_ZONE && board.scrollLeft > 1 ? -1
        : x >= rect.right - EDGE_ZONE && board.scrollLeft < board.scrollWidth - board.clientWidth - 1 ? 1
        : 0;
      if (side === edgeSide.current) return;
      stopTurning();
      edgeSide.current = side;
      if (side === 0) return;
      const turn = () => {
        stepRef.current(side);
        edgeTimer.current = window.setTimeout(turn, EDGE_REPEAT_MS);
      };
      edgeTimer.current = window.setTimeout(turn, EDGE_DWELL_MS);
    },
    onDragEnd: stopTurning,
    onDragCancel: stopTurning,
  });
  useEffect(() => stopTurning, []);

  if (columns.length === 0) return <p className="empty">{t('task.noTasks')}</p>;

  return (
    /* A board runs past the reading measure, to the right; what is read
       above it does not. */
    <div className="mode">
      {(reach.left || reach.right) && (
        <div className="boardnav">
          <span className="pager">
            <button
              className="iconbtn"
              aria-label={t('board.previous')}
              title={t('board.previous')}
              disabled={!reach.left}
              onClick={() => step(-1)}
            >
              <Icon name="arrow-left" size="sm" />
            </button>
            <button
              className="iconbtn"
              aria-label={t('board.next')}
              title={t('board.next')}
              disabled={!reach.right}
              onClick={() => step(1)}
            >
              <Icon name="arrow-right" size="sm" />
            </button>
          </span>
        </div>
      )}
      <div
        className={`board${props.group === 'day' ? ' days' : ''}`}
        ref={boardRef}
        style={page ? ({ '--colw': `${page.width}px` } as React.CSSProperties) : undefined}
      >
        {columns.map((column) => {
          /* The column's own header line: time, what is still unestimated and,
             where the column is a day, how full it is. */
          const load = summariseLoad(column.items, props.childrenOf, column.capacityMinutes ?? null);
          const parts = [
            load.estimatedMinutes > 0 ? formatDuration(load.estimatedMinutes, locale) : null,
            load.unestimatedCount > 0 ? t('metrics.unestimated', { count: load.unestimatedCount }) : null,
            load.percentage !== null ? `${load.percentage} %` : null,
          ].filter((part): part is string => part !== null);
          // An empty column has nothing to measure; "0 %" under it is noise.
          if (column.items.length === 0) parts.length = 0;
          const body = (isOver: boolean) => (
            <section className={`col${isOver ? ' dropping' : ''}`}>
            <div className="chead">
              <div className="chead-title">
                <strong>{column.title}</strong>
                <small>{t('metrics.tasks', { count: column.items.length })}</small>
              </div>
            </div>
            {parts.length > 0 && (
              <p className={`cload${load.level === 'over' ? ' over' : ''}`}>{parts.join(' · ')}</p>
            )}
            {column.items.map((item) => (
              <DraggableTask
                key={item.id}
                item={item}
                childrenOf={props.childrenOf}
                onOpen={props.onOpen}
                showProject={props.showProject}
                surface="card"
              />
            ))}
            {column.items.length === 0 && <p className="empty">{t('group.empty')}</p>}
            {/* Not a card: a card is a task, and the thing that makes one is
                the end of the column rather than something sitting in it. */}
            {(column.onAddTask ?? props.addToGroup?.(column.id)) && (
              <button
                className="coladd"
                onClick={column.onAddTask ?? props.addToGroup?.(column.id)}
              >
                <Icon name="plus" size="sm" />
                {t('nav.addTaskHere')}
              </button>
            )}
            </section>
          );

          return column.dropTarget ? (
            <Droppable target={column.dropTarget} key={column.id}>
              {({ isOver }) => body(isOver)}
            </Droppable>
          ) : (
            <div key={column.id}>{body(false)}</div>
          );
        })}
      </div>
    </div>
  );
}
