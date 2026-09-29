import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { DisplayMenu } from '@/components/DisplayMenu';
import { ModeSurface } from '@/components/ModeSurface';
import { TaskGroup } from '@/components/TaskGroup';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, rootItems, sortItems } from '@/store/selectors';
import { somedayItems, hasLabel } from '@/domain/views';
import { summariseLoad } from '@/domain/load';
import type { TranslationKey } from '@/i18n';
import type { Item } from '@/domain/types';
import type { DropTarget, RowOrder, TaskPlacement } from '@/domain/dnd';

interface SimpleListViewProps {
  kind: 'someday' | 'inbox' | 'label';
  labelName?: string;
  onOpen: (id: string) => void;
  onInsights: () => void;
  onUnestimated: () => void;
  onAddTaskTo: (placement: TaskPlacement) => void;
}

/**
 * The pages whose content is one flat selection: Someday, Inbox, and any tag
 * page such as Quick, Automation or Waiting.
 *
 * Someday deliberately shows no capacity percentage: a backlog has no deadline
 * to measure itself against.
 */
/**
 * The priority a `priority` group's key stands for.
 *
 * A group only ever offers what its own heading already fixes. Priority is
 * one of those: a column headed P2 knows every task in it is a P2, so the
 * line at the bottom of it can say so and leave everything else alone.
 */
const priorityOf = (key: string): 1 | 2 | 3 | 4 | undefined => {
  const at = Number(key.replace('p', ''));
  return at >= 1 && at <= 4 ? (at as 1 | 2 | 3 | 4) : undefined;
};

function SimpleListBody({
  kind, labelName, onOpen, onInsights, onUnestimated, onAddTaskTo,
}: SimpleListViewProps) {
  const { t } = useT();
  const { snapshot, items, childrenOf } = useData();
  const prefs = useStore((s) => s.prefs);
  const viewKey = kind === 'label' ? `label:${labelName}` : kind;
  const current = viewPrefs(prefs, viewKey);

  const scoped = useMemo(() => {
    const roots = rootItems(items);
    let selection: Item[];

    if (kind === 'someday') {
      selection = somedayItems(roots);
    } else if (kind === 'inbox') {
      const inboxId = snapshot.user?.inbox_project_id;
      selection = inboxId ? roots.filter((i) => i.project_id === inboxId) : [];
    } else {
      selection = labelName ? roots.filter((i) => hasLabel(i, labelName)) : [];
    }

    return applyFilters(selection, current.filters, snapshot, childrenOf);
  }, [items, kind, labelName, current.filters, snapshot, childrenOf]);

  /* The one flat list is drawn straight rather than through `ModeSurface`, and
     `ModeSurface` is what used to do the sorting: the sort in the display menu
     did nothing on these pages, and the order a task was put into could not
     show itself. */
  /* The Inbox is one project and is numbered like one. Un jour and a tag page
     gather tasks from every project, so they read the order Todoist keeps for
     lists like that. */
  const order: RowOrder = kind === 'inbox' ? 'project' : 'day';

  const ordered = useMemo(
    () => sortItems(scoped, current.sort, childrenOf, order, snapshot),
    [scoped, current.sort, childrenOf, order, snapshot],
  );

  const load = useMemo(
    () => summariseLoad(scoped, childrenOf, null),
    [scoped, childrenOf],
  );

  const title = kind === 'label' ? (labelName ?? '') : t(`nav.${kind}` as TranslationKey);

  /* What this page is, said twice: as the place a dropped task lands, and as
     the head start the composer opens with. */
  const inboxId = snapshot.user?.inbox_project_id;
  const dropTarget: DropTarget | undefined = kind === 'someday'
    ? { kind: 'someday' }
    : kind === 'inbox'
      ? (inboxId ? { kind: 'project', projectId: inboxId } : undefined)
      : (labelName ? { kind: 'label', label: labelName } : undefined);
  const addition = kind === 'someday'
    ? {}
    : kind === 'inbox'
      ? { projectId: inboxId }
      : { labels: labelName ? [labelName] : [] };

  /* A column is somewhere to add a task when the column fixes something the
     composer can be opened with: a project, a tag, a priority. The line then
     fills in exactly that and nothing else — a P2 column knows the priority
     and knows nothing about the date.

     An estimate column is the exception and still gets no line: its heading
     is a range, and "under 15 minutes" is not a number the composer can be
     opened with. */
  const addToGroup = (key: string): (() => void) | undefined => {
    if (current.group === 'none') return () => onAddTaskTo(addition);
    if (current.group === 'project') return () => onAddTaskTo({ ...addition, projectId: key });
    if (current.group === 'label' && key !== 'none') {
      return () => onAddTaskTo({ ...addition, labels: [...(addition.labels ?? []), key] });
    }
    if (current.group === 'priority') {
      const priority = priorityOf(key);
      if (priority) return () => onAddTaskTo({ ...addition, priority });
    }
    return undefined;
  };

  return (
    <div className="page">
      <PageHeader
        title={title}
        actions={
          <>
            <DisplayMenu
              viewKey={viewKey}
              modes={['list', 'board']}
              groups={['none', 'project', 'priority', 'label', 'estimate']}
            />
            <button className="btn accent" onClick={onInsights}>
              <Icon name="trend" />
              {t('toolbar.insights')}
            </button>
          </>
        }
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
      />


      {current.mode === 'list' && current.group === 'none' ? (
        /* One flat list is one place, so it is a group of its own rather than
           a grouping of one: somewhere to drop a task, and a standing line to
           add one that already belongs here — in the Inbox, in the project;
           on a tag page, with the tag on. */
        <div className="mode">
          <TaskGroup
            items={ordered}
            childrenOf={childrenOf}
            onOpen={onOpen}
            dropTarget={dropTarget}
            onAddTask={() => onAddTaskTo(addition)}
            keepWhenEmpty
            reorderable={order}
            viewKey={viewKey}
          />
        </div>
      ) : (
        <ModeSurface
          items={scoped}
          childrenOf={childrenOf}
          mode={current.mode}
          wide={current.wide}
          group={current.group}
          sort={current.sort}
          onOpen={onOpen}
          order={order}
          addToGroup={addToGroup}
        />
      )}
    </div>
  );
}

export function SimpleListView(props: SimpleListViewProps) {
  const prefs = useStore((s) => s.prefs);
  const viewKey = props.kind === 'label' ? `label:${props.labelName}` : props.kind;
  return (
    <SubtasksProvider value={viewPrefs(prefs, viewKey).filters.showSubtasks}>
      <SimpleListBody {...props} />
    </SubtasksProvider>
  );
}
