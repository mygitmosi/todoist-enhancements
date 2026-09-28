import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays, addMonths, addYears, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { formatDay, formatDayOrName, toApiDate, weekdayName } from '@/domain/dates';
import { dateSuggestions } from '@/domain/dateWords';
import { readNaturalDate } from '@/domain/nlp';
import type { TranslationKey } from '@/i18n';

interface DateFieldProps {
  /** An API date string, or empty for no date. */
  value: string;
  onChange: (next: string) => void;
  /** The accessible name, and what the field says when it is empty. */
  label: string;
  placeholder?: string;
  /**
   * The earliest and latest dates this field will take, as API date strings.
   *
   * Days outside them are drawn and greyed rather than hidden: a calendar that
   * silently omits the days you cannot choose gives no account of why, and the
   * whole point of showing a month is that you can see where the edge is.
   */
  min?: string;
  max?: string;
  /**
   * Whether the field can be emptied. A field standing for one end of a range
   * cannot: a range with no start is not a range.
   */
  clearable?: boolean;
  /** Row action menus already provide their own natural-language field. */
  searchable?: boolean;
  /** Open as soon as the field is mounted, for a menu whose button is already the trigger. */
  openOnMount?: boolean;
  /**
   * False where the field sits beside its own Today / Tomorrow / Next week
   * shortcuts (the row's own schedule menu): showing the current date on the
   * button too means a task due today reads "Today … Today", the second one
   * looking like a second shortcut rather than the "pick another day" button
   * it is. The button still opens on the date already picked either way —
   * only the closed face stops repeating it.
   */
  showValue?: boolean;
}

/** The shortcuts, because most dates a person picks are one of these four. */
const SHORTCUTS = [
  { key: 'today', days: 0 },
  { key: 'tomorrow', days: 1 },
  { key: 'nextWeek', days: 7 },
] as const;

/**
 * Choosing a date without leaving the app.
 *
 * `<input type="date">` is a different product every place it renders: a grey
 * three-part field on one platform, a full-bleed wheel on another, and on the
 * Mac a calendar drawn in the system's own type in the middle of a dialog this
 * app drew. This is a month, four shortcuts, and a way to clear it — in the
 * app's own type, at the app's own size, everywhere.
 */
export function DateField({
  value, onChange, label, placeholder, min, max, clearable = true, searchable = true,
  openOnMount = false, showValue = true,
}: DateFieldProps) {
  const { t, locale } = useT();
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const [open, setOpen] = useState(openOnMount);
  const [month, setMonth] = useState(() => startOfMonth(parse(value) ?? new Date()));
  const [query, setQuery] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  /* The day the keyboard is on in the grid. It is the grid's one tab stop, so
     Tab reaches the calendar once and the arrows move within it, the way a
     date grid is expected to behave. */
  const [cursor, setCursor] = useState(() => startOfDay(parse(value) ?? new Date()));
  const gridRef = useRef<HTMLDivElement>(null);
  /* Set by a key that moved the cursor, so the day it lands on takes the
     focus once it is drawn — even when that meant drawing another month. */
  const focusCursor = useRef(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = parse(value);

  /* The bounds as days, so a date is compared to a date rather than to a
     string that happens to sort. */
  const floor = parse(min ?? '');
  const ceiling = parse(max ?? '');
  const outOfRange = (day: Date): boolean =>
    (floor !== null && startOfDay(day) < startOfDay(floor))
    || (ceiling !== null && startOfDay(day) > startOfDay(ceiling));

  // Opening lands on the month being edited, not on wherever it was left.
  useEffect(() => {
    if (open) {
      const start = startOfDay(parse(value) ?? new Date());
      setMonth(startOfMonth(start));
      setCursor(start);
      setQuery('');
      setActiveSuggestion(-1);
      /* With no field to type in, the calendar is the panel, so the keyboard
         starts on it rather than on the page behind. */
      if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
      else focusCursor.current = true;
    }
  }, [open, value, searchable]);

  useLayoutEffect(() => {
    if (!focusCursor.current) return;
    const day = gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
    if (!day) return;
    focusCursor.current = false;
    day.focus({ preventScroll: true });
  });

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current?.getBoundingClientRect();
    if (!button) return;
    const height = panelRef.current?.offsetHeight ?? 340;
    const width = panelRef.current?.offsetWidth ?? 280;
    const margin = 8;
    const below = button.bottom + 4;
    const top = below + height > window.innerHeight - margin
      ? Math.max(margin, button.top - height - 4)
      : below;
    const left = Math.min(
      Math.max(margin, button.left),
      Math.max(margin, window.innerWidth - width - margin),
    );
    setPosition({ top, left });
  }, [open, month, query]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      if (buttonRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      /* Leaving from inside the panel hands the focus back to the field it
         opened from, rather than to the page once the panel is gone. */
      if (panelRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Six weeks from the Monday on or before the first of the month: always the
     same number of rows, so the panel never changes height as you page. */
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, offset) => addDays(first, offset));
  }, [month]);

  const weekdays = useMemo(() => {
    const first = startOfWeek(new Date(), { weekStartsOn: 1 });
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, offset) => fmt.format(addDays(first, offset)));
  }, [locale]);

  const suggestions = useMemo(
    () => dateSuggestions(query, locale),
    [query, locale],
  );
  const reading = useMemo(() => readNaturalDate(query), [query]);

  function pick(day: Date) {
    onChange(toApiDate(day));
    setOpen(false);
    buttonRef.current?.focus();
  }

  /* The cursor, while it is on the month shown and can be picked. Paging with
     the arrows above, or a bound, can leave it elsewhere; the grid's tab stop
     is then the month's first day that can be chosen. */
  const anchor = isSameMonth(cursor, month) && !outOfRange(cursor)
    ? cursor
    : days.find((day) => isSameMonth(day, month) && !outOfRange(day)) ?? cursor;

  /**
   * A button that acts on the press of the mouse, so the field keeps its
   * focus, and on Enter or Space too — a keyboard click has no press.
   */
  const press = (act: () => void) => ({
    onMouseDown: (event: React.MouseEvent) => { event.preventDefault(); act(); },
    onClick: (event: React.MouseEvent) => { if (event.detail === 0) act(); },
  });

  /** Moves the grid's cursor, turning the page when it leaves the month. */
  function moveCursor(next: Date) {
    const day = startOfDay(next);
    if (outOfRange(day)) return;
    setCursor(day);
    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
    focusCursor.current = true;
  }

  function onGridKey(event: React.KeyboardEvent) {
    const step: Record<string, () => Date> = {
      ArrowLeft: () => addDays(anchor, -1),
      ArrowRight: () => addDays(anchor, 1),
      ArrowUp: () => addDays(anchor, -7),
      ArrowDown: () => addDays(anchor, 7),
      Home: () => startOfWeek(anchor, { weekStartsOn: 1 }),
      End: () => endOfWeek(anchor, { weekStartsOn: 1 }),
      // Shift turns a year, as in every other date grid that has one.
      PageUp: () => (event.shiftKey ? addYears(anchor, -1) : addMonths(anchor, -1)),
      PageDown: () => (event.shiftKey ? addYears(anchor, 1) : addMonths(anchor, 1)),
    };
    if (step[event.key]) {
      event.preventDefault();
      /* The list behind has its own arrows, and they are not this grid's. */
      event.stopPropagation();
      moveCursor(step[event.key]());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (!outOfRange(anchor)) pick(anchor);
    }
  }

  function commitTyped(at = activeSuggestion) {
    const candidate = (at >= 0 ? suggestions[at]?.date : suggestions[0]?.date)
      ?? reading?.date.slice(0, 10);
    if (!candidate) return;
    const day = parse(candidate);
    if (!day || outOfRange(day)) return;
    pick(day);
  }

  const panel = open && (
    <div
      className="popover datepanel"
      role="dialog"
      aria-label={label}
      ref={panelRef}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? undefined : 'hidden',
      }}
    >
      {searchable && (
        <div className="pickersearch datepickersearch">
          <Icon name="search" size="sm" />
          <input
            ref={searchRef}
            value={query}
            placeholder={t('task.typeDate')}
            aria-label={t('task.typeDate')}
            onChange={(event) => { setQuery(event.target.value); setActiveSuggestion(-1); }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'ArrowDown' && query.trim() === '') {
                /* Nothing typed, so nothing to walk through: Down goes on to
                   the calendar below. */
                event.preventDefault();
                focusCursor.current = true;
                setCursor((at) => new Date(at));
              } else if (event.key === 'ArrowDown' && suggestions.length > 0) {
                event.preventDefault();
                setActiveSuggestion((at) => (at + 1) % suggestions.length);
              } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
                event.preventDefault();
                setActiveSuggestion((at) => (at <= 0 ? suggestions.length - 1 : at - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                commitTyped();
              } else if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
              }
            }}
          />
        </div>
      )}

      {searchable && query.trim() !== '' && (
        suggestions.length > 0 ? (
          <div className="pickersuggestions" role="listbox">
            {suggestions.map((suggestion, at) => {
              const day = parse(suggestion.date)!;
              return (
                <button
                  key={`${suggestion.date}-${suggestion.word ?? ''}`}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestion === at}
                  className={activeSuggestion === at ? 'active' : ''}
                  disabled={outOfRange(day)}
                  onMouseEnter={() => setActiveSuggestion(at)}
                  onMouseDown={(event) => { event.preventDefault(); pick(day); }}
                >
                  {/* A bare day of the month, typed with several matching
                      dates, used to show just the number three times over —
                      the very thing it could not tell apart. The full date
                      is the label now, the weekday its hint, matching the
                      row's own schedule field (#97 follow-up). */}
                  <span>{suggestion.word ?? formatDay(day, locale, dateFormat)}</span>
                  <small>
                    {suggestion.word ? formatDayOrName(day, locale, dateFormat) : weekdayName(day, locale)}
                  </small>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={`pickerreading${reading ? '' : ' none'}`}>
            {reading
              ? formatDayOrName(parse(reading.date)!, locale, dateFormat)
              : t('task.dateNotRead')}
          </p>
        )
      )}

      <div className="datepanel-quick">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.key}
            type="button"
            disabled={outOfRange(addDays(startOfDay(new Date()), shortcut.days))}
            {...press(() => pick(addDays(startOfDay(new Date()), shortcut.days)))}
          >
            {t(`date.${shortcut.key}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="datepanel-head">
        <button
          type="button"
          className="iconbtn"
          aria-label={t('date.previousMonth')}
          disabled={floor !== null && startOfMonth(floor) >= month}
          {...press(() => setMonth((m) => addMonths(m, -1)))}
        >
          <Icon name="arrow-left" size="sm" />
        </button>
        <strong>
          {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
        </strong>
        <button
          type="button"
          className="iconbtn"
          aria-label={t('date.nextMonth')}
          disabled={ceiling !== null && startOfMonth(ceiling) <= month}
          {...press(() => setMonth((m) => addMonths(m, 1)))}
        >
          <Icon name="arrow-right" size="sm" />
        </button>
      </div>

      <div className="datepanel-week" aria-hidden="true">
        {weekdays.map((day, at) => <span key={at}>{day}</span>)}
      </div>

      <div className="datepanel-grid" ref={gridRef} onKeyDown={onGridKey}>
        {days.map((day) => {
          const outside = !isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());
          const isChosen = selected !== null && isSameDay(day, selected);
          const barred = outOfRange(day);
          const isCursor = isSameDay(day, anchor);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`dateday${outside ? ' outside' : ''}${isToday ? ' today' : ''}${isChosen ? ' chosen' : ''}`}
              aria-pressed={isChosen}
              aria-label={formatDayOrName(day, locale, dateFormat)}
              tabIndex={isCursor ? 0 : -1}
              disabled={barred}
              onMouseDown={(e) => { e.preventDefault(); pick(day); }}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {value && clearable && (
        <button
          type="button"
          className="datepanel-clear"
          {...press(() => { onChange(''); setOpen(false); buttonRef.current?.focus(); })}
        >
          <Icon name="close" size="sm" />
          {t('date.clear')}
        </button>
      )}
    </div>
  );

  return (
    <span className="datefield">
      <button
        type="button"
        ref={buttonRef}
        className={`fselect-face${open ? ' open' : ''}${value && showValue ? '' : ' empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="calendar" size="sm" />
        <span className="fselect-value">
          {/* A date one day away has a name, and the name is what the reader
              wants: "17 sept. 2026" is a date you have to work out is
              tomorrow. Everything further off is written out in the order the
              settings ask for. */}
          {selected && showValue ? formatDayOrName(selected, locale, dateFormat) : (placeholder ?? label)}
        </span>
        <Icon name="caret" size="sm" />
      </button>
      {panel && createPortal(panel, document.body)}
    </span>
  );
}

/** An API date string back into a date, or null when there is not one. */
function parse(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ends the month at its last day, for callers that need the bound. */
export const lastDayOf = (month: Date): Date => endOfMonth(month);
