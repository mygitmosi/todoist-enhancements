import { colorValue } from './colors';
import { isOverdue, isToday } from './dates';
import type { Item, TableColumn, SortKey, ViewPrefs } from './types';
import type { TranslationKey } from '@/i18n';
export const TABLE_COLUMNS: TableColumn[] = ['title', 'date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project'];
/** The title always leads; the others follow in the order the user put them. */
export const tableColumns = (prefs: ViewPrefs): TableColumn[] => {
  const chosen = (prefs.tableColumns ?? TABLE_COLUMNS.slice(0, 6)).filter((column, at, all) =>
    column !== 'title' && TABLE_COLUMNS.includes(column) && all.indexOf(column) === at);
  return ['title', ...chosen];
};
export const tableColumnLabel: Record<TableColumn, TranslationKey> = {
  title: 'table.title', date: 'detail.startDate', deadline: 'detail.deadline', priority: 'detail.priority',
  estimate: 'detail.estimate', labels: 'detail.labels', description: 'detail.description', project: 'detail.project',
};
export const tableColumnSort: Record<TableColumn, SortKey> = {
  title: 'alphabetical', date: 'due', deadline: 'deadline', priority: 'priority', estimate: 'estimate-asc',
  labels: 'label', description: 'description', project: 'project',
};

/** A row tint never replaces selection or the keyboard cursor. */
export function tableRowColor(item: Item, coloration: ViewPrefs['tableColoration'], projectColor?: string): string | undefined {
  if (coloration === 'priority') return `var(--p${5 - item.priority})`;
  if (coloration === 'project') return colorValue(projectColor);
  if (coloration === 'date' && item.due) return isOverdue(item) ? 'var(--late)' : isToday(item) ? 'var(--date-today)' : 'var(--date-week)';
  return undefined;
}
