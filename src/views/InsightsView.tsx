import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Icon } from '@/components/Icon';
import { DateField } from '@/components/DateField';
import {
  Bars, ChartHead, ContributionGrid, Donut, SplitBar,
  StatTile, seriesColor, type BarDatum, type ContributionDatum,
  type SliceDatum,
} from '@/components/charts';
import { DashboardGrid, type DashboardCardSpec } from '@/components/DashboardCards';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { useData } from '@/hooks/useData';
import { useCompleted } from '@/hooks/useCompleted';
import { navigate, useRoute } from '@/hooks/useRoute';
import { rootItems } from '@/store/selectors';
import { completionBuckets, summariseInsights } from '@/domain/insights';
import {
  isDefaultDashboardOrder, moveDashboardCard, resolveDashboardOrder, type DashboardCardId,
} from '@/domain/dashboard';
import { formatDuration, estimateOf } from '@/domain/estimates';
import { formatRelativeDay, toApiDate } from '@/domain/dates';
import {
  daysOf, formatRange, granularitiesOf, previousRange,
  rangeFor, spanOf, type Grain, type Period, type Range,
} from '@/domain/periods';
import { markerStyle } from '@/domain/colors';
import { toDisplayPriority, type CompletedItem } from '@/domain/types';
import type { TranslationKey } from '@/i18n';
import { byChildOrder } from '@/domain/orderKey';
import { plainTitle } from '@/domain/markdown';

type Tab = 'overview' | 'logbook';
type LogGroup = 'day' | 'project' | 'priority';

const PRESETS: Period[] = ['day', 'week', 'month', 'quarter', 'year'];

/**
 * Insights.
 *
 * Overview answers "how did this period go" on one board; Logbook is the
 * record of what was actually finished. Everything is scoped by the period
 * picked at the top, so the two tabs always describe the same window.
 */
/**
 * The index of the highest value, the first one on a tie, or -1 when every
 * value is zero. The same rule the subtitles use to name the best day and
 * hour, so the bar lit up is the one the words point at.
 */
function firstBest(values: number[]): number {
  let best = -1;
  values.forEach((value, index) => {
    if (value > 0 && (best === -1 || value > values[best])) best = index;
  });
  return best;
}

export function InsightsView({ onOpen }: { onOpen?: (id: string) => void }) {
  const { t, locale } = useT();
  const { snapshot, items } = useData();
  const [period, setPeriod] = useState<Period>('week');
  /* Which occurrence of the period: 0 is the one holding today, -1 the one
     before. The arrows move it; picking a preset resets it. */
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState<Range | null>(null);
  // The address bar can name the tab, so the sidebar can link straight to the
  // logbook rather than landing on the overview and asking for a second click.
  const route = useRoute();
  const [tab, setTab] = useState<Tab>(route.id === 'logbook' ? 'logbook' : 'overview');

  /* The initialiser above only runs on mount, so arriving from the menu while
     the page was already open left the tab where it was. */
  useEffect(() => {
    setTab(route.id === 'logbook' ? 'logbook' : 'overview');
  }, [route.id]);
  const startDay = snapshot.user?.start_day ?? 1;
  const range = useMemo(
    () => rangeFor(period, offset, custom, startDay),
    [period, offset, custom, startDay],
  );
  const { data: completed, previous, loading, error, retry } = useCompleted(range, true);

  const pickPreset = (next: Period) => { setPeriod(next); setOffset(0); };
  /* Editing either date makes the range a custom one, starting from whatever
     the presets had produced so the other bound is already sensible. */
  const pickBound = (bound: 'since' | 'until', value: string) => {
    const at = new Date(`${value}T00:00:00`);
    if (Number.isNaN(at.getTime())) return;
    const next = bound === 'since'
      ? { since: at, until: range.until < at ? at : range.until }
      : { since: range.since > at ? at : range.since, until: at };
    setCustom(next);
    setPeriod('custom');
    setOffset(0);
  };
  // The period after this one has not happened yet.
  const atPresent = rangeFor(period, offset + 1, custom, startDay).since > new Date();

  const roots = useMemo(() => rootItems(items), [items]);
  const summary = useMemo(
    () => summariseInsights(completed, roots, snapshot),
    [completed, roots, snapshot],
  );
  const previousSummary = useMemo(
    () => summariseInsights(previous, roots, snapshot),
    [previous, roots, snapshot],
  );

  const intl = locale === 'fr' ? 'fr-FR' : 'en-GB';

  /* The layout can be edited on the overview only, and leaving the tab ends it. */
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (tab !== 'overview') setEditing(false); }, [tab]);
  const storedOrder = useStore((s) => s.prefs.dashboardOrder);
  const setPrefs = useStore((s) => s.setPrefs);
  const toast = useStore((s) => s.toast);
  const order = useMemo(() => resolveDashboardOrder(storedOrder), [storedOrder]);

  /* Short ranges read day by day, years month by month, and a quarter gives
     the reader both useful resolutions instead of choosing for them. */
  const grainOptions = granularitiesOf(spanOf(range), period);
  const [grainChoice, setGrainChoice] = useState<Grain>('day');
  const grain = grainOptions.includes(grainChoice) ? grainChoice : (grainOptions[0] ?? null);

  /* The detailed charts show only the selected period. Comparisons belong in
     the summary cards, where they do not obscure individual days or hours. */
  const perBucket: BarDatum[] = useMemo(() => {
    if (grain === null) return [];
    const buckets = completionBuckets(completed, range, grain);
    /* Every bar in the data colour, and the best one in the accent: the
       card's subtitle names it, and the bar it names is the one lit up. */
    const best = firstBest(buckets.map((bucket) => bucket.value));

    return buckets.map((bucket, index) => ({
      key: bucket.key,
      label: bucketLabel(bucket.at, grain, intl, spanOf(range) <= 14),
      value: bucket.value,
      current: index === best,
    }));
  }, [completed, range, grain, intl]);

  const byHour: BarDatum[] = useMemo(() => {
    const best = firstBest(summary.byHour);
    return summary.byHour.map((value, hour) => ({
      key: String(hour), label: `${String(hour).padStart(2, '0')}h`, value,
      current: hour === best,
    }));
  }, [summary.byHour]);

  const byProject: SliceDatum[] = useMemo(
    () =>
      summary.byProject.map((entry, index) => ({
        key: entry.projectId,
        label: entry.name,
        value: entry.count,
        color: seriesColor(index),
      })),
    [summary.byProject],
  );

  /* Priority is a fixed set of states, not an open list of series, so it keeps
     Todoist's own four colours — including the deliberate grey of P4 — and
     every slice is named in the legend rather than left to its hue. */
  const byPriority: SliceDatum[] = useMemo(
    () =>
      ([1, 2, 3, 4] as const).map((p) => ({
        key: `p${p}`,
        label: t(`common.p${p}` as TranslationKey),
        value: summary.priorities[`p${p}` as 'p1'],
        color: `var(--p${p})`,
      })),
    [summary.priorities, t],
  );

  const byLabel: SliceDatum[] = useMemo(
    () =>
      summary.byLabel.filter((entry) => !entry.untagged).map((entry, index) => ({
        key: entry.label,
        label: `@${entry.label}`,
        value: entry.count,
        color: seriesColor(index),
      })),
    [summary.byLabel],
  );

  const tasksPerDay = spanOf(range) > 0
    ? Math.round(summary.completedCount / spanOf(range))
    : 0;
  const previousTasksPerDay = spanOf(previousRange(range)) > 0
    ? Math.round(previousSummary.completedCount / spanOf(previousRange(range)))
    : 0;
  const bestDay = summary.byDay.reduce<{ date: string; count: number } | null>(
    (best, day) => !best || day.count > best.count ? day : best, null,
  );
  const bestHour = summary.byHour.reduce(
    (best, count, hour) => count > best.count ? { hour, count } : best,
    { hour: 0, count: 0 },
  );

  const tasksLabel = (count: number) => t('metrics.tasks', { count });
  /* The change since the period before, as a signed number the colour only
     repeats: green for more, red for less, neutral for none. What it is set
     against is in the tooltip and in the accessible name, not drawn (#174). */
  const comparison = (
    current: number, earlier: number,
    formatValue: (value: number) => string = String,
    deltaUnit = '', previousUnit = deltaUnit,
  ) => {
    const delta = current - earlier;
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
    const text = `${sign}${formatValue(Math.abs(delta))}${deltaUnit}`;
    const baseline = t('insights.previousValue', { value: `${formatValue(earlier)}${previousUnit}` });
    return <strong
      className={`compare-delta${delta > 0 ? ' up' : delta < 0 ? ' down' : ''}`}
      title={baseline}
      aria-label={`${text}; ${baseline}`}
    >
      {text}
    </strong>;
  };
  const showHeatmap = period === 'quarter' || period === 'year'
    || (period === 'custom' && spanOf(range) >= 89);

  /* Every selected day is loaded, including a full year. The grid can scroll
     horizontally rather than hiding the longest and most useful timeframe. */
  const contribution: ContributionDatum[] = useMemo(() => {
    const counts = countByDay(completed);
    return daysOf(range).map((at) => {
      const key = format(at, 'yyyy-MM-dd');
      return {
        key,
        label: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short' }).format(at),
        value: counts.get(key) ?? 0,
      } satisfies ContributionDatum;
    });
  }, [completed, range, intl]);

  const bestBucket = grain === 'month'
    ? perBucket.reduce<BarDatum | null>((best, bucket) => (!best || bucket.value > best.value ? bucket : best), null)
    : null;

  const heatmapSpan = period !== 'year' && spanOf(range) <= 180 ? 6 : 12;

  /* Every card the dashboard can show, by name. A card that makes no sense for
     the period in front of you (the heatmap on a week, the trend on a day) is
     simply absent, and the order kept for it waits for the period that has it. */
  const specs: Partial<Record<DashboardCardId, DashboardCardSpec>> = {
    completed: {
      id: 'completed', name: t('insights.completedTasks'), span: 3, className: 'metric-card',
      children: <>
        <Icon name="check" className="metric-icon" />
        <StatTile
          label={t('insights.completedTasks')}
          value={summary.completedCount}
          hint={comparison(summary.completedCount, previousSummary.completedCount)}
        />
      </>,
    },
    pace: {
      id: 'pace', name: t('insights.tasksPerDay'), span: 3, className: 'metric-card',
      children: <>
        <Icon name="calendar" className="metric-icon" />
        <StatTile
          label={t('insights.tasksPerDay')}
          value={tasksPerDay}
          hint={comparison(tasksPerDay, previousTasksPerDay)}
        />
      </>,
    },
    time: {
      id: 'time', name: t('insights.completedTime'), span: 3, className: 'metric-card',
      children: <>
        <Icon name="clock" className="metric-icon" />
        <StatTile
          label={t('insights.completedTime')}
          value={formatDuration(summary.completedMinutes, locale).replace(/\s+/g, '')}
          hint={comparison(summary.completedMinutes, previousSummary.completedMinutes,
            (value) => formatDuration(value, locale))}
        />
      </>,
    },
    focus: {
      id: 'focus', name: t('insights.focusScore'), span: 3, className: 'metric-card focus-metric',
      children: <>
        <Icon name="flag" className="metric-icon" />
        <StatTile
          label={t('insights.focusScore')}
          value={`${summary.focusScore}%`}
          hint={comparison(summary.focusScore, previousSummary.focusScore, String, ' pts', '%')}
        />
        <SplitBar data={byPriority} format={(count) =>
          `${summary.completedCount > 0 ? Math.round(count / summary.completedCount * 100) : 0}%`
        } />
      </>,
    },
    /* A single day has no series of days inside it. */
    ...(grain !== null && {
      trend: {
        id: 'trend' as const, name: t('dashboard.card.trend'), span: 6,
        children: <>
          <ChartHead
            title={t(`insights.per_${grain}` as TranslationKey)}
            subtitle={grain === 'month'
              ? (bestBucket && bestBucket.value > 0
                ? t('insights.bestMonth', { month: bestBucket.label, tasks: tasksLabel(bestBucket.value) })
                : t('insights.noHistory'))
              : (bestDay
                ? t('insights.bestDay', {
                  day: new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${bestDay.date}T12:00:00`)),
                  tasks: tasksLabel(bestDay.count),
                })
                : t('insights.noHistory'))}
            trailing={grainOptions.length > 1 ? (
              <div className="segmented small chart-grain" aria-label={t('insights.granularity')}>
                {grainOptions.map((option) => (
                  <button
                    key={option}
                    aria-pressed={grain === option}
                    onClick={() => setGrainChoice(option)}
                  >
                    <small>{t(`insights.grain.${option}` as TranslationKey)}</small>
                  </button>
                ))}
              </div>
            ) : undefined}
          />
          <Bars
            data={perBucket}
            height={160}
            labelEvery={perBucket.length > 14 ? Math.ceil(perBucket.length / 12) : 1}
            emptyLabel={t('insights.noHistory')}
            format={(value) => String(value)}
          />
        </>,
      },
    }),
    hours: {
      id: 'hours', name: t('insights.dayActivity'), span: grain === null ? 12 : 6,
      children: <>
        <ChartHead
          title={t('insights.dayActivity')}
          subtitle={bestHour.count > 0
            ? t('insights.bestHour', { hour: `${String(bestHour.hour).padStart(2, '0')}h–${String((bestHour.hour + 1) % 24).padStart(2, '0')}h`, tasks: tasksLabel(bestHour.count) })
            : t('insights.noHistory')}
        />
        <Bars
          data={byHour}
          height={160}
          labelEvery={3}
          emptyLabel={t('insights.noHistory')}
          format={tasksLabel}
        />
      </>,
    },
    ...(showHeatmap && contribution.length > 0 && {
      heatmap: {
        id: 'heatmap' as const, name: t('insights.contribution'), span: heatmapSpan,
        children: <>
          <ChartHead title={t('insights.contribution')} subtitle={t('insights.contributionHint')} />
          <ContributionGrid
            data={contribution}
            emptyLabel={t('insights.noHistory')}
            summary={t('insights.contributionSummary', {
              active: summary.activeDays,
              total: contribution.length,
            })}
            lessLabel={t('insights.lessActivity')}
            moreLabel={t('insights.moreActivity')}
          />
        </>,
      },
    }),
    projects: {
      id: 'projects', name: t('insights.byProject'), span: 6,
      children: <>
        <ChartHead title={t('insights.byProject')} />
        <Donut
          data={byProject}
          limit={6}
          otherLabel={t('insights.otherProjects')}
          total={summary.completedCount}
          caption={t('insights.tasks')}
          emptyLabel={t('insights.noHistory')}
        />
      </>,
    },
    tags: {
      id: 'tags', name: t('insights.byLabel'), span: 6,
      children: <>
        <ChartHead title={t('insights.byLabel')} />
        <Donut
          data={byLabel}
          limit={6}
          total={byLabel.reduce((sum, entry) => sum + entry.value, 0)}
          caption={t('insights.tagUses')}
          otherLabel={t('insights.otherTags')}
          emptyLabel={t('insights.noHistory')}
        />
      </>,
    },
  };
  const cards = order
    .map((id) => specs[id])
    .filter((spec): spec is DashboardCardSpec => spec !== undefined);

  const moveCard = (id: DashboardCardId, toIndex: number, visible: DashboardCardId[]) => {
    const next = moveDashboardCard(order, visible as DashboardCardId[], id, toIndex);
    setPrefs({ dashboardOrder: isDefaultDashboardOrder(next) ? [] : next });
  };
  const resetLayout = () => {
    setPrefs({ dashboardOrder: [] });
    toast(t('dashboard.layoutReset'));
  };

  return (
    <div className="page wide">
      <div className="phead">
        <div>
          <h1 className="ptitle">
            {t('insights.title')}
            {/* Which dates the period stands for, beside the title where it is
                seen at once, and changing with the period (#174). */}
            <small className="dashboard-title-range" aria-live="polite">{formatRange(range, intl)}</small>
          </h1>
        </div>
        <div className="pactions">
          {tab === 'overview' && (
            <>
            {editing && (
              <button
                className="btn"
                disabled={isDefaultDashboardOrder(order)}
                onClick={resetLayout}
              >
                {t('dashboard.resetLayout')}
              </button>
            )}
            <button className="btn" aria-pressed={editing} onClick={() => setEditing((on) => !on)}>
              <Icon name={editing ? 'check' : 'sliders'} size="sm" />
              {editing ? t('dashboard.doneEditing') : t('dashboard.editLayout')}
            </button>
            </>
          )}

        </div>
      </div>

      <div className="viewbar periodbar">
        <span className="pager">
          <button
            className="iconbtn"
            aria-label={t('insights.previous')}
            title={t('insights.previous')}
            onClick={() => setOffset((o) => o - 1)}
          >
            <Icon name="arrow-left" size="sm" />
          </button>
          <button
            className="iconbtn"
            aria-label={t('insights.next')}
            title={t('insights.next')}
            disabled={atPresent}
            onClick={() => setOffset((o) => o + 1)}
          >
            <Icon name="arrow-right" size="sm" />
          </button>
        </span>
        {PRESETS.map((value) => (
          <button
            key={value}
            className="btn"
            aria-pressed={period === value && offset === 0}
            onClick={() => pickPreset(value)}
          >
            {t(`insights.period.${value}` as TranslationKey)}
          </button>
        ))}
        {/* The dates the presets resolve to, editable: change one and the
            range becomes your own. */}
        <span className="rangefields">
          {/* The app's own calendar, not the browser's. `<input type="date">`
              was the one control the rest of the app refuses to use, and it
              put the system's picker, in the system's type, in the middle of a
              page drawn in this one's. */}
          <span className="rangefield">
            <span className="rangefield-label">{t('insights.from')}</span>
            <DateField
              value={toApiDate(range.since)}
              label={t('insights.from')}
              max={toApiDate(new Date())}
              clearable={false}
              onChange={(next) => pickBound('since', next)}
            />
          </span>
          <span className="rangefield">
            <span className="rangefield-label">{t('insights.to')}</span>
            <DateField
              value={toApiDate(range.until)}
              label={t('insights.to')}
              min={toApiDate(range.since)}
              clearable={false}
              onChange={(next) => pickBound('until', next)}
            />
          </span>
        </span>
      </div>

      <div className="tabs" role="tablist">
        {(['overview', 'logbook'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => navigate('insights', value === 'logbook' ? 'logbook' : undefined)}
          >
            {t(`insights.${value}` as TranslationKey)}
          </button>
        ))}
      </div>

      {editing && tab === 'overview' && <p className="psub dash-hint">{t('dashboard.layoutHint')}</p>}

      {loading && <p className="empty" role="status">{t('insights.loading')}</p>}

      {error !== null && (
        <div className="empty" role="alert">
          <p>{t(typeof navigator !== 'undefined' && navigator.onLine === false ? 'insights.offline' : 'insights.failed')}</p>
          <button className="btn" onClick={retry}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && error === null && tab === 'overview' && (
        <DashboardGrid
          cards={cards}
          headings={{ summary: t('insights.dashboardSummary'), activity: t('insights.dashboardActivity') }}
          editing={editing}
          onMove={moveCard}
        />
      )}

      {!loading && error === null && tab === 'logbook' && <Logbook completed={completed} onOpen={onOpen} />}

      {/* The foot of a page that has been read to the bottom. */}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function bucketLabel(at: Date, grain: Grain, intl: string, weekday = false): string {
  if (grain === 'month') {
    return new Intl.DateTimeFormat(intl, { month: 'short' }).format(at);
  }
  return new Intl.DateTimeFormat(
    intl,
    weekday ? { weekday: 'short' } : { day: 'numeric', month: 'short' },
  ).format(at);
}

function countByDay(items: CompletedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = format(new Date(item.completed_at), 'yyyy-MM-dd');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/* ------------------------------------------------------------------ */

function Logbook({ completed, onOpen }: { completed: CompletedItem[]; onOpen?: (id: string) => void }) {
  const setLogbookEntry = useStore((s) => s.setLogbookEntry);
  /* A row opens its task, as a row does anywhere else (#103). The entry goes
     with it: the panel needs its date, and in the demo it is all there is. */
  const open = (task: CompletedItem) => {
    if (!onOpen) return;
    setLogbookEntry(task);
    onOpen(task.task_id ?? task.id);
  };
  const { t, locale } = useT();
  const { snapshot } = useData();
  const [group, setGroup] = useState<LogGroup>('day');
  /* Several projects and several priorities at once: one of each was never
     the question anybody asked of a record. Empty means "all". */
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFiltersOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const filtered = useMemo(
    () =>
      completed.filter((task) => {
        if (projectFilter.length > 0 && !projectFilter.includes(task.project_id)) return false;
        if (priorityFilter.length > 0
          && !priorityFilter.includes(toDisplayPriority(task.priority ?? 1))) return false;
        return true;
      }),
    [completed, projectFilter, priorityFilter],
  );

  const activeFilters = projectFilter.length + priorityFilter.length;
  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; rows: typeof filtered }>();
    for (const task of filtered) {
      const at = new Date(task.completed_at);
      let key: string;
      let title: string;

      if (group === 'project') {
        key = task.project_id;
        title = snapshot.projects[task.project_id]?.name ?? '—';
      } else if (group === 'priority') {
        const p = toDisplayPriority(task.priority ?? 1);
        key = `p${p}`;
        title = `P${p}`;
      } else {
        key = format(at, 'yyyy-MM-dd');
        title = formatRelativeDay(at, locale);
      }

      const bucket = map.get(key);
      if (bucket) bucket.rows.push(task);
      else map.set(key, { title, rows: [task] });
    }

    const entries = [...map.entries()].map(([key, value]) => ({ key, ...value }));
    // Days read newest first, priorities from P1 down, projects largest first.
    if (group === 'day') return entries.sort((a, b) => b.key.localeCompare(a.key));
    if (group === 'priority') return entries.sort((a, b) => a.key.localeCompare(b.key));
    return entries.sort((a, b) => b.rows.length - a.rows.length);
  }, [filtered, group, snapshot.projects, locale]);

  const projects = Object.values(snapshot.projects)
    .filter((p) => !p.is_deleted && !p.is_folder)
    .sort(byChildOrder);

  return (
    <>
      <div className="viewbar logbar">
        <div className="displaywrap" ref={filtersRef}>
          <button
            className="btn"
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Icon name="sliders" />
            {t('logbook.filters')}
            {activeFilters > 0 && <span className="displaycount">{activeFilters}</span>}
          </button>

          {filtersOpen && (
            <div className="popover displaypanel anchor-left" role="dialog" aria-label={t('logbook.filters')}>
              <div className="panelhead">
                <h5>{t('toolbar.group')}</h5>
                {activeFilters > 0 && (
                  <button
                    className="resetbtn"
                    onClick={() => { setProjectFilter([]); setPriorityFilter([]); }}
                  >
                    {t('filter.clear')}
                  </button>
                )}
              </div>

              <div className="segmented">
                {(['day', 'project', 'priority'] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={group === value}
                    onClick={() => setGroup(value)}
                  >
                    <small>{t(`group.${value}` as TranslationKey)}</small>
                  </button>
                ))}
              </div>

              <h5>{t('filter.priorities')}</h5>
              <div className="chiprow">
                {([1, 2, 3, 4] as const).map((p) => (
                  <button
                    key={p}
                    className="chip"
                    aria-pressed={priorityFilter.includes(p)}
                    onClick={() => setPriorityFilter((list) => toggleIn(list, p as number))}
                  >
                    <span className="flagdot" style={{ background: `var(--p${p})` }} />
                    P{p}
                  </button>
                ))}
              </div>

              <h5>{t('filter.projects')}</h5>
              <div className="chiprow scroll">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className="chip"
                    aria-pressed={projectFilter.includes(project.id)}
                    onClick={() => setProjectFilter((list) => toggleIn(list, project.id))}
                  >
                    <span className="hash" style={markerStyle(project.color)}>#</span>
                    {project.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="kpi-label">{t('metrics.tasks', { count: filtered.length })}</span>
      </div>

      {groups.length === 0 ? (
        <p className="empty">{t('insights.noHistory')}</p>
      ) : (
        <div className="logbook">
          {groups.map((entry) => (
            <section className="logday" key={entry.key}>
              <h4>
                {entry.title}
                <span className="gcount">{entry.rows.length}</span>
              </h4>
              {entry.rows.map((task) => {
                const project = snapshot.projects[task.project_id];
                const minutes = estimateOf({ labels: task.labels ?? [], duration: task.duration });
                const priority = toDisplayPriority(task.priority ?? 1);
                return (
                  <div
                    className={`logrow${onOpen ? ' opens' : ''}`}
                    key={`${task.id}-${task.completed_at}`}
                    // The panel's own ▲ ▼ (#104) walk `[data-task-id]` rows on
                    // the page; a Logbook row is one of them once this is set.
                    data-task-id={onOpen ? task.task_id ?? task.id : undefined}
                    role={onOpen ? 'button' : undefined}
                    tabIndex={onOpen ? 0 : undefined}
                    onClick={onOpen ? () => open(task) : undefined}
                    onKeyDown={onOpen ? (e) => {
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        // These rows now carry `data-task-id` (#104's ▲ ▼),
                        // which is also what the app-wide list cursor reads
                        // to move on its own ↓ / ↑ — stopped here, or it
                        // moved a second row on top of this one.
                        e.stopPropagation();
                        const rows = [...document.querySelectorAll<HTMLElement>('.logrow[tabindex]')];
                        const at = rows.indexOf(e.currentTarget);
                        const next = rows[at + (e.key === 'ArrowDown' ? 1 : -1)];
                        next?.focus();
                        return;
                      }
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(task); }
                    } : undefined}
                  >
                    <span className={`logtick p${priority}`}><Icon name="check" size="sm" /></span>
                    <span className="logname">{plainTitle(task.content)}</span>
                    {project && (
                      <span className="logmeta" style={markerStyle(project.color, false)}>
                        #{project.name}
                      </span>
                    )}
                    <span className="logmeta time">
                      {minutes !== null ? formatDuration(minutes, locale) : '—'}
                    </span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
