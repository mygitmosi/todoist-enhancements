import { useLayoutEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import {
  dashboardGroupOf, fillRows, type DashboardCardId, type DashboardGroup,
} from '@/domain/dashboard';

/** A card of the dashboard: what it is called, how wide it wants to be, and what is in it. */
export interface DashboardCardSpec {
  id: DashboardCardId;
  /** Named in the controls and in what a screen reader is told. */
  name: string;
  /** Columns of twelve it asks for. */
  span: number;
  className?: string;
  children: ReactNode;
}

interface DashboardGridProps {
  /** Every card to draw, already in the order to draw them in. */
  cards: DashboardCardSpec[];
  /** The headings of the two sections, which cards never leave. */
  headings: Record<DashboardGroup, string>;
  /** Whether the layout is being edited: arrows show only then. */
  editing: boolean;
  /** A card asked to be at `toIndex` among the cards drawn of its own section. */
  onMove: (id: DashboardCardId, toIndex: number, visible: DashboardCardId[]) => void;
}

/**
 * The dashboard's cards, in the order the person arranged.
 *
 * Outside editing the cards are plain: nothing to press that was not there
 * before. In editing each one carries a pair of
 * arrows, so the same move is open to a pointer and to a keyboard, and each
 * move is said aloud. Cards stay in the section they belong to, so the two
 * headings stay true, and each card keeps the width appropriate to its period.
 */
export function DashboardGrid({ cards, headings, editing, onMove }: DashboardGridProps) {
  const { t } = useT();
  const [announcement, setAnnouncement] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = grid.current;
    if (!node) return;
    const align = () => {
      const cards = [...node.querySelectorAll<HTMLElement>('.card')];
      cards.forEach((card) => card.style.removeProperty('--dashboard-heading-height'));
      const rows = new Map<number, Array<{ card: HTMLElement; height: number }>>();
      cards.forEach((card) => {
        const heading = card.querySelector<HTMLElement>('.chead-row');
        if (!heading) return;
        const top = Math.round(card.offsetTop);
        const row = rows.get(top) ?? [];
        row.push({ card, height: heading.getBoundingClientRect().height });
        rows.set(top, row);
      });
      rows.forEach((row) => {
        const height = Math.max(...row.map((entry) => entry.height));
        row.forEach(({ card }) => card.style.setProperty('--dashboard-heading-height', `${height}px`));
      });
    };
    align();
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, [cards, editing]);

  const groups = useMemo(() => (['summary', 'activity'] as const).map((group) => {
    const own = cards.filter((card) => dashboardGroupOf(card.id) === group);
    const spans = fillRows(own.map((card) => card.span));
    return { group, own, spans };
  }), [cards]);

  const position = (id: DashboardCardId) => {
    const own = groups.find((entry) => entry.own.some((card) => card.id === id));
    return { at: own?.own.findIndex((card) => card.id === id) ?? 0, count: own?.own.length ?? 0, own };
  };
  const nameOf = (id: DashboardCardId) => cards.find((card) => card.id === id)?.name ?? '';

  const move = (id: DashboardCardId, toIndex: number) => {
    const { own } = position(id);
    if (!own) return;
    onMove(id, toIndex, own.own.map((card) => card.id));
    const clamped = Math.max(0, Math.min(own.own.length - 1, toIndex));
    setAnnouncement(t('dashboard.moved', { name: nameOf(id), position: clamped + 1, count: own.own.length }));
  };

  return (
    <>
      <div ref={grid} className="bento dashboard-bento" data-editing={editing || undefined}>
        {groups.map(({ group, own, spans }) => own.length > 0 && (
          <SectionOfCards key={group}>
            <h2 className="dashboard-group-label">{headings[group]}</h2>
              {own.map((card, index) => (
                <DashboardCard
                  key={card.id}
                  card={card}
                  span={spans[index]}
                  editing={editing}
                  index={index}
                  count={own.length}
                  onMove={move}
                />
              ))}

          </SectionOfCards>
        ))}
      </div>
      <div className="sr" role="status" aria-live="polite">{announcement}</div>
    </>
  );
}

/** A fragment with a name: the grid's children are the headings and the cards themselves. */
function SectionOfCards({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface DashboardCardProps {
  card: DashboardCardSpec;
  span: number;
  editing: boolean;
  index: number;
  count: number;
  onMove: (id: DashboardCardId, toIndex: number) => void;
}

function DashboardCard({ card, span, editing, index, count, onMove }: DashboardCardProps) {
  const { t } = useT();

  return (
    <section
      className={`card w${span}${card.className ? ` ${card.className}` : ''}${editing ? ' editing' : ''}`}
      data-card={card.id}
    >
      {editing && (
        <div className="dash-edit">
          <button
            className="iconbtn"
            aria-label={t('dashboard.moveEarlier', { name: card.name })}
            title={t('dashboard.moveEarlier', { name: card.name })}
            disabled={index === 0}
            onClick={() => onMove(card.id, index - 1)}
          >
            <Icon name="caret-up" size="sm" />
          </button>
          <button
            className="iconbtn"
            aria-label={t('dashboard.moveLater', { name: card.name })}
            title={t('dashboard.moveLater', { name: card.name })}
            disabled={index === count - 1}
            onClick={() => onMove(card.id, index + 1)}
          >
            <Icon name="caret" size="sm" />
          </button>
        </div>
      )}
      <div className="dashboard-card-content">{card.children}</div>
    </section>
  );
}
