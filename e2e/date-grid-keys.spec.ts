import { test, expect, row, rows } from './demo';

/** The day the calendar's keyboard is on, by its accessible name. */
const focusedDay = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

test('#97 the row menu calendar is driven from the keyboard', async ({ demo: page }) => {
  const title = await rows(page).first().locator('.ttitle').innerText();
  await row(page, title).focus();
  await page.keyboard.press('ControlOrMeta+s');
  const menu = page.locator('.rowmenu.schedulemenu');
  await expect(menu).toBeVisible();

  // The one picker (#110): the typed field has the caret, ↓ walks the choices
  // and then goes on into the month, which is always open.
  await expect(menu.locator('.datepicker-field input')).toBeFocused();
  const grid = menu.locator('.datepanel-grid');
  for (let at = 0; at < 8 && !(await grid.locator('.dateday:focus').count()); at += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(grid.locator('.dateday:focus')).toBeVisible();
  // The arrows were the picker's, not the row's: no task panel.
  await expect(page.locator('.detail-top')).toHaveCount(0);

  const start = await focusedDay(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await focusedDay(page)).not.toBe(start);
  // The arrows were the grid's: the list behind did not move, and its menu is still there.
  await expect(menu).toHaveCount(1);

  const month = () => menu.locator('.datepanel-head strong').innerText();
  const before = await month();
  await page.keyboard.press('PageDown');
  await expect.poll(month).not.toBe(before);
  await page.keyboard.press('PageUp');
  await expect.poll(month).toBe(before);

  // Escape closes the menu.
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

/** ↓ from the typed field through the quick choices, into the month (#110). */
async function intoMonth(page: import('@playwright/test').Page) {
  const day = page.locator('.datepanel-grid .dateday:focus');
  for (let at = 0; at < 8 && !(await day.count()); at += 1) await page.keyboard.press('ArrowDown');
  await expect(day).toBeVisible();
}

test('#97 the composer calendar: Down from the field, arrows, Enter picks', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const face = page.locator('.composer-chips .datefield button').first();
  await expect(face).toBeVisible();
  await face.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.datepanel input')).toBeFocused();

  await intoMonth(page);
  await page.keyboard.press('ArrowRight');
  const picked = await focusedDay(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('.datepanel')).toHaveCount(0);
  await expect(face).toBeFocused();
  await expect(face).not.toHaveText(/Date/);
  expect(picked).not.toBe('');

  // Home and End stay within the week of the day the keyboard is on.
  await page.keyboard.press('Enter');
  await expect(page.locator('.datepanel input')).toBeFocused();
  await intoMonth(page);
  await page.keyboard.press('End');
  const end = await focusedDay(page);
  await page.keyboard.press('Home');
  expect(await focusedDay(page)).not.toBe(end);
  await page.keyboard.press('Escape');
  await expect(face).toBeFocused();
});
