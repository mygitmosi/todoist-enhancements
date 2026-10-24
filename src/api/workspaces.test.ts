import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./client', () => ({ request: vi.fn() }));
import { request } from './client';
import { fetchProjectCounts, fetchWorkspaceArchive, fetchWorkspaceCollection } from './workspaces';

beforeEach(() => vi.resetAllMocks());
describe('workspace reads', () => {
  it('paginates archive using the proper personal and team response fields', async () => {
    vi.mocked(request).mockResolvedValueOnce({ workspace_projects: [{ id: 'a' }], has_more: true, next_cursor: 'next' }).mockResolvedValueOnce({ workspace_projects: [{ id: 'b' }], has_more: false });
    expect(await fetchWorkspaceArchive('team')).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(vi.mocked(request).mock.calls[1][0]).toContain('cursor=next');
    vi.mocked(request).mockResolvedValueOnce({ results: [], next_cursor: null });
    expect(await fetchWorkspaceArchive('personal')).toEqual([]);
    expect(vi.mocked(request).mock.calls[2][0]).toContain('/projects/archived?');
  });
  it('keeps the workspace filter on member pagination and does not turn permission failures into empty lists', async () => {
    vi.mocked(request).mockResolvedValueOnce({ workspace_users: [{ user_id: 'a' }], has_more: true, next_cursor: 'next' }).mockRejectedValueOnce(new Error('Forbidden'));
    await expect(fetchWorkspaceCollection('/workspaces/users?workspace_id=team', 'workspace_users')).rejects.toThrow('Forbidden');
    expect(vi.mocked(request).mock.calls[1][0]).toContain('workspace_id=team');
  });
  it('does not confuse section and parent counts with project totals', async () => {
    vi.mocked(request).mockResolvedValueOnce({ completed_info: [{ project_id: 'p', completed_items: 12 }, { project_id: 'p', section_id: 's', completed_items: 5 }, { item_id: 'i', completed_items: 3 }] });
    expect(await fetchProjectCounts()).toEqual({ p: 12 });
  });
  it('rejects malformed collection responses rather than claiming the workspace is empty', async () => {
    vi.mocked(request).mockResolvedValueOnce({});
    await expect(fetchWorkspaceArchive('team')).rejects.toThrow('Invalid workspace response');
  });
});
