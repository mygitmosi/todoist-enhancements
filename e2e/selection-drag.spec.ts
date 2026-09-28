import { test, expect, go, rows } from './demo';

const ids = (page: import('@playwright/test').Page) =>
  rows(page).evaluateAll((all) => all.map((r) => (r as HTMLElement).dataset.taskId ?? ''));

test('#105 a selection dragged between rows lands there as one block, shown as a stack', async ({ demo: page }) => {
  await go(page, '#/project/personal');
  // A drop arranges the list by hand, so it is compared under the manual order.
  await page.getByRole('button', { name: 'Display' }).click();
  await page.locator('.panelgrid .fselect-face').nth(1).click();
  await page.getByRole('option', { name: 'Manual' }).click();
  await page.keyboard.press('Escape');
  const before = await ids(page);
  expect(before.length).toBeGreaterThanOrEqual(5);
  const [first, , third, , fifth] = before;

  // Pick the first and the fifth, and carry the first below the third.
  await page.locator(`.screen.active [data-task-id="${first}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await page.locator(`.screen.active [data-task-id="${fifth}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await expect(page.getByRole('toolbar')).toContainText('2 selected');

  const dragged = page.locator(`.screen.active [data-task-id="${first}"]`);
  await dragged.hover();
  const from = (await dragged.locator('.drag').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 4, from.y + 20, { steps: 5 });
  await expect(page.locator('.dragoverlay.stacked .dragcount')).toHaveText('2');
  await expect(page.locator(`.screen.active [data-task-id="${fifth}"]`)).toHaveCSS('opacity', '0.45');

  const to = (await page.locator(`.screen.active [data-task-id="${third}"]`).boundingBox())!;
  await page.mouse.move(from.x + 4, to.y + to.height / 2, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();

  await expect.poll(() => ids(page)).toEqual([
    before[1], third, first, fifth, ...before.slice(3).filter((id) => id !== fifth),
  ]);

  // One undo puts both back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => ids(page)).toEqual(before);
});
