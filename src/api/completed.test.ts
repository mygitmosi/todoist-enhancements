import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

import { request } from './client';
import { fetchCompleted, windowsOf } from './completed';
import type { CompletedItem } from '@/domain/types';

const sent = vi.mocked(request);
const done = (id: string, at: string) => ({ id, task_id: id, completed_at: at }) as CompletedItem;
const DAY = 24 * 3600_000;

beforeEach(() => { sent.mockReset(); });

describe('the period asked of Todoist (#131)', () => {
  it('is sent as exact instants, so a single day is not an empty window', async () => {
    sent.mockResolvedValue({ items: [] } as never);
    const since = new Date(2026, 8, 29, 0, 0, 0, 0);
    const until = new Date(2026, 8, 29, 23, 59, 59, 999);

    await fetchCompleted(since, until);

    const { query } = sent.mock.calls[0][1] as { query: Record<string, string> };
    expect(query.since).toBe(since.toISOString());
    expect(query.until).toBe(until.toISOString());
    expect(query.since).toMatch(/T.*Z$/);
    expect(new Date(query.until).getTime() - new Date(query.since).getTime()).toBeGreaterThan(23 * 3600_000);
  });
});

describe('windowsOf (#131)', () => {
  const since = new Date(2026, 0, 1);
  const until = new Date(2026, 11, 31, 23, 59, 59, 999);

  it('covers the period with no gap, starting at its start and ending at its end', () => {
    const windows = windowsOf(since, until, 89);
    expect(windows[0].since).toEqual(since);
    expect(windows.at(-1)!.until).toEqual(until);
    for (let at = 1; at < windows.length; at += 1) {
      expect(windows[at].since).toEqual(windows[at - 1].until);
    }
  });

  it('never makes a window longer than asked', () => {
    for (const window of windowsOf(since, until, 89)) {
      const days = (window.until.getTime() - window.since.getTime()) / DAY;
      expect(days).toBeLessThanOrEqual(89.05);
    }
  });

  it('makes one window of a short period', () => {
    const day = windowsOf(new Date(2026, 8, 29), new Date(2026, 8, 29, 23, 59, 59, 999), 89);
    expect(day).toHaveLength(1);
  });
});

describe('a completion on the boundary of two windows', () => {
  it('is counted once', async () => {
    const since = new Date(2026, 0, 1);
    const until = new Date(2026, 6, 1);
    sent.mockResolvedValue({ items: [done('t1', '2026-03-31T12:00:00.000Z')] } as never);

    const items = await fetchCompleted(since, until);

    expect(sent.mock.calls.length).toBeGreaterThan(1);
    expect(items).toHaveLength(1);
  });
});
