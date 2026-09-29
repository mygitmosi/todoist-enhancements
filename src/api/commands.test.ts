import { beforeEach, describe, expect, it, vi } from 'vitest';
import { command, MAX_COMMANDS_PER_CALL, sendCommands } from './commands';
import { ApiError, request } from './client';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

const sent = vi.mocked(request);

/** Answers every batch with "ok" for each command, and maps any temp ids. */
function answerOk(mapping: Record<string, string> = {}) {
  sent.mockImplementation(async (_path, init) => {
    const batch = JSON.parse((init as { form: { commands: string } }).form.commands) as Array<{ uuid: string }>;
    return {
      sync_token: 'next',
      sync_status: Object.fromEntries(batch.map((cmd) => [cmd.uuid, 'ok'])),
      temp_id_mapping: mapping,
    } as never;
  });
}

beforeEach(() => { sent.mockReset(); });

describe('sendCommands', () => {
  it('sends 250 commands in batches of at most 100', async () => {
    answerOk();
    const commands = Array.from({ length: 250 }, (_, at) => command('item_update', { id: `t${at}` }));
    const result = await sendCommands('token', commands);
    const sizes = sent.mock.calls.map(([, init]) =>
      JSON.parse((init as { form: { commands: string } }).form.commands).length);
    expect(sizes).toEqual([MAX_COMMANDS_PER_CALL, MAX_COMMANDS_PER_CALL, 50]);
    expect(result.delivered).toHaveLength(250);
    expect(result.failures).toEqual([]);
  });

  it('rewrites temp ids in later batches once Todoist has answered them', async () => {
    answerOk({ 'tmp-project': 'real-project' });
    const commands = [
      command('project_add', { name: 'New' }, 'tmp-project'),
      ...Array.from({ length: MAX_COMMANDS_PER_CALL }, () =>
        command('item_add', { content: 'x', project_id: 'tmp-project' })),
    ];
    await sendCommands('token', commands);
    const second = JSON.parse((sent.mock.calls[1][1] as { form: { commands: string } }).form.commands);
    expect(second[0].args.project_id).toBe('real-project');
  });

  it('refuses to send nothing', async () => {
    await expect(sendCommands('token', [])).rejects.toThrow();
  });
});

describe('a request Todoist refuses outright (#134)', () => {
  /* The one path a refusal takes: `sendCommands` resolves, with a failure for
     each command in the refused request. It never throws a refusal, which is
     why the callers have no branch for one. */
  it('resolves, with every command of the request as a failure that says why', async () => {
    const commands = [command('item_update', { id: 'a' }), command('item_update', { id: 'b' })];
    sent.mockRejectedValue(new ApiError('Todoist responded 400', 400, { error: 'Invalid argument' }));

    const result = await sendCommands('token', commands);

    expect(result.failures).toEqual(commands.map((cmd) => ({ uuid: cmd.uuid, error: 'Invalid argument' })));
    expect(result.delivered).toEqual(commands.map((cmd) => cmd.uuid));
    expect(result.undelivered).toEqual([]);
  });

  it('still throws a network failure when nothing had gone yet', async () => {
    sent.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendCommands('token', [command('item_update', { id: 'a' })])).rejects.toThrow('Failed to fetch');
  });
});
