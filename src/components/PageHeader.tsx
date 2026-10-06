import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { formatDuration } from '@/domain/estimates';
import type { LoadSummary } from '@/domain/load';

/** The "I have time" pill (#159): the page offers it by passing this. */
export interface TimePillProps {
  /** How long was chosen, or null while nothing is. */
  minutes: number | null;
  /** The panel is open. */
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}

interface PageHeaderProps {
  /** A node, not a string: a project's title renames in place. */
  title: ReactNode;
  /** Real content only — a project's description. Never a description of the view. */
  subtitle?: ReactNode;
  /** Display and Insights: the controls for this page, on the title line. */
  actions?: ReactNode;
  load: LoadSummary;
  /** Opens the list of tasks on this page that have no estimate. */
  onOpenUnestimated?: () => void;
  /** Offers the time filter on this page. Left out on the pages it does not belong on. */
  time?: TimePillProps;
}

/**
 * The line every page shares: what this page is, how much is on it, and
 * whether that fits. The percentage only appears where capacity means
 * something, which the caller decides by passing it or not.
 */
export function PageHeader({
  title, subtitle, actions, load, onOpenUnestimated, time,
}: PageHeaderProps) {
  const { t, locale } = useT();

  return (
    <>
      <div className="phead">
        <div className="phead-text">
          <h1 className="ptitle">{title}</h1>
          {/* A div, not a p: the project description is an editable block and
              markup cannot legally sit inside a paragraph. */}
          {subtitle && <div className="psub">{subtitle}</div>}
        </div>
        {actions && <div className="pactions">{actions}</div>}
      </div>

      <div className="metrics" data-tour="metrics">
        <span className="metric">
          <Icon name="tasks" size="sm" />
          <b>{load.taskCount}</b> {t('metrics.taskWord', { count: load.taskCount })}
        </span>

        {load.estimatedMinutes > 0 && (
          <>
            <span className="sep">·</span>
            <span className="metric">
              <Icon name="clock" size="sm" />
              <b>{formatDuration(load.estimatedMinutes, locale)}</b>{' '}
              {t('metrics.estimatedWord')}
            </span>
          </>
        )}

        {load.percentage !== null && (
          <>
            <span className="sep">·</span>
            <span
              className={`loadpill ${load.level === 'ok' ? 'ok' : load.level === 'tight' ? 'warn' : 'over'}`}
              title={t('metrics.loadTooltip')}
            >
              {load.percentage}%
            </span>
          </>
        )}

        {time && (
          <>
            <span className="sep">·</span>
            {/* Right after the load pill: the same line, the same question —
                how much room there is — asked the other way round. */}
            <span className={`timepill${time.minutes !== null && time.open ? ' on' : ''}`} data-tour="time">
              <button
                className="timepill-main"
                aria-expanded={time.open}
                title={t('time.pillHint')}
                onClick={time.onToggle}
              >
                <Icon name="clock" size="sm" />
                {time.minutes !== null
                  ? t('time.pillActive', { duration: formatDuration(time.minutes, locale) })
                  : t('time.pill')}
              </button>
              {time.minutes !== null && (
                <button
                  className="timepill-x"
                  aria-label={t('time.clear')}
                  title={t('time.clear')}
                  onClick={time.onClear}
                >
                  <Icon name="close" size="sm" />
                </button>
              )}
            </span>
          </>
        )}

        {load.unestimatedCount > 0 && (
          <>
            <span className="sep">·</span>
            {onOpenUnestimated ? (
              <button
                className="metric metric-link"
                onClick={() => onOpenUnestimated()}
                title={t('issues.toComplete')}
              >
                {t('metrics.unestimated', { count: load.unestimatedCount })}
              </button>
            ) : (
              <span className="metric" style={{ color: 'var(--faint)' }}>
                {t('metrics.unestimated', { count: load.unestimatedCount })}
              </span>
            )}
          </>
        )}
      </div>
    </>
  );
}
