import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/api/tasks', () => ({ fetchTask: vi.fn() }));
import { fetchTask } from '@/api/tasks';
import { addItem, updateItem, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { defaultPreferences } from './prefs';
import { verifyEstimateWrites } from './estimate-safety';
import type { AppState } from './types';

function setup() {
  const snapshot = emptySnapshot();
  snapshot.items.a = item({ id: 'a', labels: ['work'], duration: { amount: 25, unit: 'minute' } });
  const state = { snapshot, prefs: { ...defaultPreferences('en'), estimateStorage: 'duration' }, resolvedIds: {},
    setPrefs: vi.fn((patch) => { Object.assign(state.prefs, patch); }),
    apply: vi.fn(async (_commands, optimistic) => { state.snapshot = optimistic(state.snapshot); return {}; }),
    toast: vi.fn(),
  } as unknown as AppState;
  const get = () => state;
  const set = (patch: Partial<AppState>) => Object.assign(state, patch);
  const command: Command = { ...updateItem('a', { duration: { amount: 25, unit: 'minute' } }), estimateMinutes: 25 };
  const result: CommandResult = { responses: [], mapping: {}, failures: [], delivered: [command.uuid], undelivered: [] };
  return { state, get, set, command, result };
}

beforeEach(() => vi.clearAllMocks());

describe('duration read-back safety', () => {
  it('reads the server even when the optimistic estimate matches', async () => {
    const { state, get, set, command, result } = setup();
    vi.mocked(fetchTask).mockResolvedValue(item({ id: 'a', duration: { amount: 25, unit: 'minute' } }));
    const outcome = await verifyEstimateWrites(get, set, [command], result, state.snapshot);
    expect(fetchTask).toHaveBeenCalledWith('a');
    expect(outcome.pending).toEqual([]);
    expect(state.apply).not.toHaveBeenCalled();
    expect(state.prefs.estimateStorage).toBe('duration');
  });
  it('recovers silently dropped estimates as tags and announces one downgrade per batch', async () => {
    const { state, get, set, command, result } = setup();
    state.snapshot.items.b = item({ id: 'b', duration: { amount: 40, unit: 'minute' } });
    const second = { ...updateItem('b', { duration: { amount: 40, unit: 'minute' } }), estimateMinutes: 40 };
    result.delivered.push(second.uuid);
    vi.mocked(fetchTask).mockImplementation(async (id) => item({ id, labels: ['work'] }));
    await verifyEstimateWrites(get, set, [command, second], result, state.snapshot);
    expect(state.snapshot.items.a.labels).toEqual(['work', 'est-25']);
    expect(state.snapshot.items.b.labels).toEqual(['work', 'est-40']);
    expect(state.prefs.estimateStorage).toBe('tag');
    expect(state.toast).toHaveBeenCalledTimes(1);
    const writes = vi.mocked(state.apply).mock.calls[0][0];
    expect(writes.every((c) => !('duration' in c.args))).toBe(true);
  });
  it('retains an unverified creation with its resolved id and original uuid', async () => {
    const { state, get, set, result } = setup();
    const creation = { ...addItem({ content: 'New', duration: { amount: 25, unit: 'minute' } }, 'temp'), estimateMinutes: 25 };
    result.mapping.temp = 'real'; result.delivered = [creation.uuid];
    vi.mocked(fetchTask).mockRejectedValue(new TypeError('offline'));
    const outcome = await verifyEstimateWrites(get, set, [creation], result, state.snapshot);
    expect(outcome.pending).toMatchObject([{ type: 'item_update', uuid: creation.uuid, args: { id: 'real' }, estimateMinutes: 25 }]);
    expect(state.apply).not.toHaveBeenCalled();
  });
  it('checks only the final queued intent for a task', async () => {
    const { state, get, set, command, result } = setup();
    const last = { ...updateItem('a', { duration: { amount: 90, unit: 'minute' } }), estimateMinutes: 90 };
    result.delivered.push(last.uuid);
    vi.mocked(fetchTask).mockResolvedValue(item({ id: 'a', duration: { amount: 90, unit: 'minute' } }));
    await verifyEstimateWrites(get, set, [command, last], result, state.snapshot);
    expect(state.apply).not.toHaveBeenCalled();
    expect(state.snapshot.items.a.duration?.amount).toBe(90);
  });
  it('recovers a plan refusal but leaves unrelated validation failures to normal handling', async () => {
    const { state, get, set, command, result } = setup();
    state.snapshot.items.a.duration = { amount: 60, unit: 'minute' };
    result.failures = [{ uuid: command.uuid, error: 'Premium subscription required for duration' }];
    const outcome = await verifyEstimateWrites(get, set, [command], result, state.snapshot);
    expect(outcome.handled.has(command.uuid)).toBe(true);
    expect(state.snapshot.items.a.duration?.amount).toBe(60);
    expect(state.snapshot.items.a.labels).toContain('est-25');
    const other = setup();
    other.result.failures = [{ uuid: other.command.uuid, error: 'Invalid project id' }];
    await verifyEstimateWrites(other.get, other.set, [other.command], other.result, other.state.snapshot);
    expect(other.state.apply).not.toHaveBeenCalled();
  });
  it('verifies explicit clears and preserves a different calendar duration on fallback', async () => {
    const { state, get, set, command, result } = setup();
    vi.mocked(fetchTask).mockResolvedValue(item({ id: 'a', duration: { amount: 60, unit: 'minute' }, labels: ['work'] }));
    await verifyEstimateWrites(get, set, [command], result, state.snapshot);
    expect(state.snapshot.items.a.duration?.amount).toBe(60);
    expect(state.snapshot.items.a.labels).toContain('est-25');
    const clear = setup(); clear.command.estimateMinutes = null;
    vi.mocked(fetchTask).mockResolvedValue(item({ id: 'a', duration: null }));
    await verifyEstimateWrites(clear.get, clear.set, [clear.command], clear.result, clear.state.snapshot);
    expect(clear.state.apply).not.toHaveBeenCalled();
  });
  it('bounds server read-back concurrency to four requests', async () => {
    const { state, get, set, result } = setup();
    const commands = Array.from({ length: 12 }, (_, i) => ({ ...updateItem(String(i), { duration: { amount: 25, unit: 'minute' } }), estimateMinutes: 25 }));
    result.delivered = commands.map((cmd) => cmd.uuid);
    let active = 0; let peak = 0;
    vi.mocked(fetchTask).mockImplementation(async (id) => {
      active++; peak = Math.max(peak, active);
      await Promise.resolve(); active--;
      return item({ id, duration: { amount: 25, unit: 'minute' } });
    });
    await verifyEstimateWrites(get, set, commands, result, state.snapshot);
    expect(peak).toBe(4);
    expect(fetchTask).toHaveBeenCalledTimes(12);
  });

});
