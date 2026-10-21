import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable, type SortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { TABLE_COLUMNS, tableColumns, tableColumnLabel } from '@/domain/table';
import type { TableColumn, ViewPrefs } from '@/domain/types';

/** A chip never stretches to the width of the one it replaces while it is carried. */
const chipStrategy: SortingStrategy = (args) => {
  const move = rectSortingStrategy(args);
  return move ? { ...move, scaleX: 1, scaleY: 1 } : null;
};

type Movable = Exclude<TableColumn, 'title'>;

/**
 * The columns of a table: the shown ones first, in the order they read, and
 * dragged (or moved with Alt and an arrow key) to change it; then the hidden
 * ones, a click away. Clicking a shown column hides it.
 */
export function TableColumnEditor({ current, onChange }: {
  current: ViewPrefs; onChange: (columns: TableColumn[]) => void;
}) {
  const { t } = useT();
  const shown = tableColumns(current).filter((column): column is Movable => column !== 'title');
  const hidden = TABLE_COLUMNS.filter((column): column is Movable => column !== 'title' && !shown.includes(column));
  // A short distance before a drag starts, so pressing a chip still switches it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const move = (column: Movable, to: number) => {
    const from = shown.indexOf(column);
    if (from >= 0 && to >= 0 && to < shown.length && to !== from) onChange(arrayMove(shown, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(active.id as Movable, shown.indexOf(over.id as Movable));
  };

  return (
    <div className="detailschips table-column-chips" role="group" aria-label={t('table.columns')}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown} strategy={chipStrategy}>
          {shown.map((column) => (
            <ShownChip key={column} column={column}
              onHide={() => onChange(shown.filter((value) => value !== column))}
              onStep={(by) => move(column, shown.indexOf(column) + by)} />
          ))}
        </SortableContext>
      </DndContext>
      {hidden.map((column) => (
        <button key={column} type="button" className="chip" aria-pressed={false}
          onClick={() => onChange([...shown, column])}>
          {t(tableColumnLabel[column])}
        </button>
      ))}
      <small className="mhint">{t('details.moveHint')}</small>
    </div>
  );
}

function ShownChip({ column, onHide, onStep }: { column: Movable; onHide: () => void; onStep: (by: -1 | 1) => void }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={`chip movable${isDragging ? ' dragging' : ''}`}
      aria-pressed
      style={{ transform: CSS.Transform.toString(transform), transition }}
      title={t('details.moveHint')}
      onClick={onHide}
      onKeyDown={(event) => {
        if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          onStep(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <Icon name="drag" size="sm" className="chipgrip" />
      {t(tableColumnLabel[column])}
    </button>
  );
}
