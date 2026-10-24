import { test, expect, go } from './demo';
import type { Page } from '@playwright/test';

type TestItem = { id: string; content: string; labels: string[]; section_id: string | null; project_id: string; due: unknown; checked: boolean; [key: string]: unknown };
type TestState = { snapshot: { items: Record<string, TestItem>; [key: string]: unknown }; setViewPrefs: (key: string, patch: Record<string, unknown>) => void };
type TestStore = { getState: () => TestState; setState: (patch: Partial<TestState>) => void };

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled demo scenarios use the development store');
async function seed(page: Page) {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: TestStore }).__store;
    const state = store.getState();
    const snapshot = state.snapshot;
    const base = Object.values(snapshot.items)[0];
    const items = Object.fromEntries(Object.entries(snapshot.items).filter(([, item]) => item.project_id !== 'site'));
    for (const [id, step, section] of [['r216-a', '', 's-todo'], ['r216-b', 'step-in-progress', 's-doing'], ['r216-c', 'step-done', 's-review']]) {
      items[id] = { ...base, id, content: id, project_id: 'site', section_id: section, parent_id: null, labels: ['work', 'est-30', ...(step ? [step] : [])], checked: false, is_deleted: false, responsible_uid: null, due: null, description: '' };
    }
    store.setState({ snapshot: { ...snapshot, items } });
    store.getState().setViewPrefs('project:site', { mode: 'board', group: 'step', sort: 'manual' });
  });
  await go(page, '#/project/site');
}
async function saved(page: Page, id: string) {
  return page.evaluate((id) => (window as unknown as { __store: TestStore }).__store.getState().snapshot.items[id], id);
}

test('Step board drag onto an occupied card preserves sections and dates and can be undone', async ({ demo: page }) => {
  await seed(page);
  const columns = page.locator('.board .col');
  await expect(columns).toHaveCount(3);
  const source = page.locator('[data-task-id="r216-a"]');
  const target = page.locator('[data-task-id="r216-c"]');
  const before = await saved(page, 'r216-a');
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 90, from.y + 12);
  await page.mouse.down();
  await page.mouse.move(from.x + 100, from.y + 12, { steps: 5 });
  await page.mouse.move(to.x + 90, to.y + 12, { steps: 25 });
  await page.mouse.up();
  await expect.poll(async () => (await saved(page, 'r216-a')).labels).toContain('step-done');
  const after = await saved(page, 'r216-a');
  expect(after.section_id).toBe(before.section_id);
  expect(after.project_id).toBe(before.project_id);
  expect(after.due).toEqual(before.due);
  expect(after.checked).toBe(false);
  expect(after.labels).toContain('work');
  await expect(page.locator('.board .col').filter({ has: page.locator('.chead strong', { hasText: 'Done' }) }).locator('[data-task-id="r216-a"]')).toBeVisible();
  await page.getByRole('button', { name: /^Undo —/ }).click();
  await expect.poll(async () => (await saved(page, 'r216-a')).labels).toEqual(before.labels);
});

test('Step quick add and list keyboard moves keep the project and section', async ({ demo: page }) => {
  await seed(page);
  const doing = page.locator('.board .col').filter({ has: page.locator('.chead strong', { hasText: 'In progress' }) });
  await doing.getByRole('button', { name: /Add task/ }).click();
  const composer = page.getByRole('dialog', { name: 'Add task', exact: true });
  await composer.getByRole('textbox', { name: 'Task name', exact: true }).fill('Step quick add');
  await composer.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(doing.locator('.ttitle', { hasText: 'Step quick add' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __store: TestStore }).__store.getState().setViewPrefs('project:site', { mode: 'list' }));
  const source = page.locator('[data-task-id="r216-a"]');
  await source.focus();
  await page.keyboard.press('Meta+ArrowDown');
  expect((await saved(page, 'r216-a')).section_id).toBe('s-todo');
  await expect.poll(async () => (await saved(page, 'r216-a')).labels).toContain('step-in-progress');
});

for (const theme of ['light', 'dark']) test(`${theme}: selected board card is uniform; Escape clears outlines and Tab restores focus`, async ({ demo: page }) => {
  await seed(page);
  await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
  const task = page.locator('[data-task-id="r216-a"]');
  await task.locator('.ttitle').click({ modifiers: ['Meta'], position: { x: 4, y: 6 } });
  await page.mouse.move(0, 0);
  await expect(task).toHaveClass(/picked/);
  const colours = await task.evaluate((el) => ({ row: getComputedStyle(el).backgroundColor, shell: getComputedStyle(el.parentElement!).backgroundColor, expected: getComputedStyle(el).getPropertyValue('--row-marked') }));
  expect(colours.row).toBe('rgba(0, 0, 0, 0)');
  expect(colours.shell).not.toBe('rgba(0, 0, 0, 0)');
  expect(await task.locator('.check').first().evaluate((el) => getComputedStyle(el).borderWidth)).toBe('2px');
  await page.keyboard.press('Escape');
  await expect(task).not.toHaveClass(/picked/);
  await page.getByRole('button', { name: /^Display/ }).click();
  await page.keyboard.press('Escape');
  const display = page.getByRole('button', { name: /^Display/ });
  expect(await display.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  await display.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.documentElement.dataset.navigation)).toBe('keyboard');
});

test('list project / section chip obeys display preferences and project pages show only the section', async ({ demo: page }) => {
  await seed(page);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: TestStore }).__store, state = store.getState();
    const item = state.snapshot.items['r216-a'];
    const now = new Date(); const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: { ...item, due: { date, string: date, is_recurring: false } } } } });
    store.getState().setViewPrefs('week', { mode: 'list' });
  });
  await go(page, '#/week');
  const task = page.locator('[data-task-id="r216-a"]');
  await expect(task.locator('.proj')).toHaveAttribute('title', /.+ \/ .+/);
  await expect(task.locator('.sect')).toHaveCount(0);
  await go(page, '#/project/site');
  await page.evaluate(() => (window as unknown as { __store: TestStore }).__store.getState().setViewPrefs('project:site', { mode: 'list', group: 'step' }));
  await expect(task.locator('.proj')).toHaveCount(0);
  await expect(task.locator('.sect')).toBeVisible();
});

for (const width of [1280, 390]) test(`workspace at ${width}px has projects, archive and team members; caret still collapses`, async ({ demo: page }) => {
  await page.setViewportSize({ width, height: 844 });
  await go(page, '#/workspace/personal');
  await expect(page.locator('.workspace-project-name').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: /^People/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^Archive/ })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Show archived' }).click();
  await expect(page.getByRole('heading', { name: /^Archive/ })).toBeVisible();
  expect(await page.locator('.workspace-page').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await go(page, '#/workspace/ws-pro');
  await page.getByRole('tab', { name: /^People/ }).click();
  await expect(page.locator('.workspace-person', { hasText: 'Alex Martin' })).toBeVisible();
});

test('step changes queue offline, survive a real snapshot reload and flush on reconnect', async ({ demo: page }) => {
  await seed(page);
  const writes: Array<{ type: string; args: { id: string; labels?: string[] } }> = [];
  await page.route('https://api.todoist.com/**', async (route) => {
    const body = new URLSearchParams(route.request().postData() ?? '');
    const commands = JSON.parse(body.get('commands') ?? '[]') as Array<{ uuid: string; type: string; args: { id: string; labels?: string[] } }>;
    writes.push(...commands);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ sync_token: 'test-sync', full_sync: false, sync_status: Object.fromEntries(commands.map((c) => [c.uuid, 'ok'])) }) });
  });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); });
  await page.evaluate(async () => {
    const authPath = '/src/api/auth.ts';
    const { auth } = await import(authPath);
    await auth.set('test-only-fake-token-never-sent-to-todoist');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const store = (window as unknown as { __store: { setState: (value: Record<string, unknown>) => void; getState: () => { sendTo: (id: string, target: { kind: string; step: string }, destination: string) => Promise<void> } } }).__store;
    store.setState({ demo: false, connected: true });
    await store.getState().sendTo('r216-a', { kind: 'step', step: 'done' }, 'Done');
  });
  await expect.poll(() => page.evaluate(async () => {
    const path = '/src/db/idb.ts'; const { loadSnapshot, readQueue } = await import(path);
    return { labels: (await loadSnapshot()).items['r216-a']?.labels, queued: (await readQueue()).length };
  })).toMatchObject({ labels: ['work', 'est-30', 'step-done'], queued: 1 });
  await page.reload();
  await expect.poll(async () => (await saved(page, 'r216-a'))?.labels).toContain('step-done');
  expect((await saved(page, 'r216-a')).section_id).toBe('s-todo');
  await page.evaluate(async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    await (window as unknown as { __store: { getState: () => { refresh: () => Promise<void> } } }).__store.getState().refresh();
  });
  await expect.poll(() => writes.filter((write) => write.type === 'item_update' && write.args.id === 'r216-a').length).toBeGreaterThan(0);
  expect(writes.find((write) => write.type === 'item_update' && write.args.id === 'r216-a')?.args.labels).toEqual(['work', 'est-30', 'step-done']);
});
