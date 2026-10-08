import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DASHBOARD_ORDER, fillRows, isDefaultDashboardOrder, moveDashboardCard,
  resolveDashboardOrder, type DashboardCardId,
} from './dashboard';

const DEFAULT = [...DEFAULT_DASHBOARD_ORDER];

describe('the stored order of the dashboard cards (#172)', () => {
  it('is the default when nothing was kept', () => {
    expect(resolveDashboardOrder(undefined)).toEqual(DEFAULT);
    expect(resolveDashboardOrder([])).toEqual(DEFAULT);
    expect(resolveDashboardOrder('nonsense')).toEqual(DEFAULT);
  });

  it('keeps every card exactly once, whatever was stored', () => {
    const stored = ['tags', 'bogus', 'tags', 'completed', 7, null];
    const order = resolveDashboardOrder(stored);
    expect([...order].sort()).toEqual([...DEFAULT].sort());
    expect(order.slice(0, 2)).toEqual(['tags', 'completed']);
  });

  it('puts a card the list lacks near its default neighbours, not at the end', () => {
    const stored = DEFAULT.filter((id) => id !== 'heatmap');
    expect(resolveDashboardOrder(stored)).toEqual(DEFAULT);
  });

  it('knows the default when it sees it', () => {
    expect(isDefaultDashboardOrder(DEFAULT)).toBe(true);
    expect(isDefaultDashboardOrder(['tags', ...DEFAULT.filter((id) => id !== 'tags')])).toBe(false);
    expect(isDefaultDashboardOrder([])).toBe(false);
  });
});

describe('moving a card', () => {
  const activity = (order: DashboardCardId[]) => order.filter((id) => !['completed', 'pace', 'time', 'focus'].includes(id));

  it('moves a card earlier or later among the ones that are drawn', () => {
    const visible: DashboardCardId[] = ['trend', 'hours', 'heatmap', 'projects', 'tags'];
    expect(activity(moveDashboardCard(DEFAULT, visible, 'tags', 0))).toEqual(['tags', 'trend', 'hours', 'heatmap', 'projects']);
    expect(activity(moveDashboardCard(DEFAULT, visible, 'trend', 1))).toEqual(['hours', 'trend', 'heatmap', 'projects', 'tags']);
    expect(activity(moveDashboardCard(DEFAULT, visible, 'trend', 99))).toEqual(['hours', 'heatmap', 'projects', 'tags', 'trend']);
  });

  it('leaves the other group alone', () => {
    const visible: DashboardCardId[] = ['trend', 'hours', 'heatmap', 'projects', 'tags'];
    expect(moveDashboardCard(DEFAULT, visible, 'tags', 0).slice(0, 4)).toEqual(['completed', 'pace', 'time', 'focus']);
  });

  it('does not forget where a card that is not drawn belongs', () => {
    // A week has no heatmap. Moving tags first must leave the heatmap's place for the day a quarter shows it.
    const visible: DashboardCardId[] = ['trend', 'hours', 'projects', 'tags'];
    const moved = moveDashboardCard(DEFAULT, visible, 'tags', 0);
    expect(activity(moved)).toEqual(['tags', 'trend', 'heatmap', 'hours', 'projects']);
    // And once it is back, the arrangement is still there.
    expect(resolveDashboardOrder(moved)).toEqual(moved);
  });

  it('changes nothing for a card that is not drawn or a move to where it already is', () => {
    const visible: DashboardCardId[] = ['trend', 'hours'];
    expect(moveDashboardCard(DEFAULT, visible, 'tags', 0)).toEqual(DEFAULT);
    expect(moveDashboardCard(DEFAULT, visible, 'trend', 0)).toEqual(DEFAULT);
  });
});

describe('the widths a row is given', () => {
  it('leaves rows that fill themselves alone', () => {
    expect(fillRows([3, 3, 3, 3])).toEqual([3, 3, 3, 3]);
    expect(fillRows([6, 6, 12, 6, 6])).toEqual([6, 6, 12, 6, 6]);
  });

  it('keeps half-width cards half width beside a full-width heatmap and at the end', () => {
    expect(fillRows([6, 6, 6, 6, 6])).toEqual([6, 6, 6, 6, 6]);
    expect(fillRows([6, 12, 6, 6])).toEqual([6, 12, 6, 6]);
    expect(fillRows([12, 6])).toEqual([12, 6]);
  });
});
