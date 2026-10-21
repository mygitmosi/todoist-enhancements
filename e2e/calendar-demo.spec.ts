import { test, expect, go } from './demo';

for (const view of ['week', 'upcoming', 'inbox', 'someday', 'filter/f2']) {
  test(`production Calendar opens on ${view} and retains list and board`, async ({ demo: page }) => {
    await go(page, view);
    const active = page.locator('.screen.active');
    const display = active.getByRole('button', { name: /^Display(?: \d+)?$/ });
    await display.click();
    const menu = active.getByRole('dialog', { name: 'Display', exact: true });
    await menu.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(menu.getByRole('button', { name: 'Grouping', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Sort', exact: true })).toBeVisible();
    await display.click();
    await expect(active.locator('.calendar-time-column')).toHaveCount(7);
    await active.locator('.calendar').getByRole('button', { name: /^No date:/ }).click();
    await expect(active.locator('.calendar-undated')).toBeVisible();
    await display.click();
    await menu.getByRole('button', { name: 'Board', exact: true }).click();
    await expect(menu.getByRole('button', { name: 'Grouping', exact: true })).toBeVisible();
    await menu.getByRole('button', { name: 'List', exact: true }).click();
    await display.click();
    await expect(active.locator('.calendar')).toHaveCount(0);
  });
}
