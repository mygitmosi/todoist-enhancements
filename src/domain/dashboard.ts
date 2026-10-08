/**
 * The cards of the Insights dashboard and the order they are drawn in (#172).
 *
 * Every card is named here, in the order the dashboard opens with. A person's
 * own order is a list of these names kept with the account's settings, and it
 * is read generously: a name that is no longer a card is dropped, a card the
 * list has never heard of takes its default place, and a card that is not
 * drawn for the period in front of you (the heatmap on a week) keeps the
 * place it had, so choosing another period never forgets an arrangement.
 */

/** The four numbers at the top. */
export const SUMMARY_CARDS = ['completed', 'pace', 'time', 'focus'] as const;
/** The charts under them. */
export const ACTIVITY_CARDS = ['trend', 'hours', 'heatmap', 'projects', 'tags'] as const;

export type DashboardCardId = (typeof SUMMARY_CARDS)[number] | (typeof ACTIVITY_CARDS)[number];
export type DashboardGroup = 'summary' | 'activity';

export const DEFAULT_DASHBOARD_ORDER: readonly DashboardCardId[] = [
  ...SUMMARY_CARDS, ...ACTIVITY_CARDS,
];

export const dashboardGroupOf = (id: DashboardCardId): DashboardGroup =>
  (SUMMARY_CARDS as readonly string[]).includes(id) ? 'summary' : 'activity';

const known = new Set<string>(DEFAULT_DASHBOARD_ORDER);

/** The order of every card: what was kept, then whatever it did not mention. */
export function resolveDashboardOrder(stored: unknown): DashboardCardId[] {
  const kept: DashboardCardId[] = [];
  if (Array.isArray(stored)) {
    for (const id of stored) {
      if (typeof id === 'string' && known.has(id) && !kept.includes(id as DashboardCardId)) {
        kept.push(id as DashboardCardId);
      }
    }
  }
  const missing = DEFAULT_DASHBOARD_ORDER.filter((id) => !kept.includes(id));
  if (kept.length === 0) return [...DEFAULT_DASHBOARD_ORDER];
  /* A card the stored order lacks goes where the default puts it relative to
     its neighbours, so a card added later does not end up at the very end. */
  const out = [...kept];
  for (const id of missing) {
    const at = DEFAULT_DASHBOARD_ORDER.indexOf(id);
    const before = DEFAULT_DASHBOARD_ORDER.slice(0, at).reverse().find((other) => out.includes(other));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, id);
  }
  return out;
}

/** Whether an order is the default, so it need not be stored. */
export const isDefaultDashboardOrder = (order: readonly string[]): boolean =>
  order.length === DEFAULT_DASHBOARD_ORDER.length
  && order.every((id, at) => id === DEFAULT_DASHBOARD_ORDER[at]);

/**
 * The full order after one card is moved to `toIndex` among the cards
 * currently drawn.
 *
 * The drawn cards are permuted among the places they already hold, so a card
 * that is not drawn now stays exactly where it was in the list, and so does
 * every card of the other group.
 */
export function moveDashboardCard(
  full: readonly DashboardCardId[],
  visible: readonly DashboardCardId[],
  id: DashboardCardId,
  toIndex: number,
): DashboardCardId[] {
  const from = visible.indexOf(id);
  if (from < 0) return [...full];
  const to = Math.max(0, Math.min(visible.length - 1, toIndex));
  if (to === from) return [...full];

  const arranged = [...visible];
  arranged.splice(to, 0, ...arranged.splice(from, 1));
  const slots = full
    .map((card, at) => (visible.includes(card) ? at : -1))
    .filter((at) => at >= 0);
  const out = [...full];
  slots.forEach((slot, index) => { out[slot] = arranged[index]; });
  return out;
}

/** Card widths belong to their period and remain stable when neighbours move. */
export function fillRows(spans: readonly number[]): number[] {
  return [...spans];
}
