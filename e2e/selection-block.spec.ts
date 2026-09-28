import { test, expect, go, rows } from './demo';

test('#106 picked rows next to each other are joined into one block', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');

  const picked = page.locator('.screen.active .task.picked');
  await expect(picked).toHaveCount(3);
  await expect(picked.nth(0)).toHaveClass(/join-down/);
  await expect(picked.nth(0)).not.toHaveClass(/join-up/);
  await expect(picked.nth(1)).toHaveClass(/join-up join-down|join-down join-up/);
  await expect(picked.nth(2)).toHaveClass(/join-up/);
  await expect(picked.nth(2)).not.toHaveClass(/join-down/);
  expect(await picked.nth(1).evaluate((row) => getComputedStyle(row).borderTopLeftRadius)).toBe('0px');

  // A gap in the selection makes two blocks.
  await rows(page).nth(1).click({ modifiers: ['ControlOrMeta'] });
  await expect(page.locator('.screen.active .task.picked.join-up')).toHaveCount(0);
});

test('#106 follow-up: the cursor is a border, so deselecting a row leaves no fill behind', async ({ demo: page }) => {
  await go(page, '#/inbox');
  const first = rows(page).first();

  // A plain cursor (arrow keys, no selection) is a border, not the picked fill.
  await page.keyboard.press('ArrowDown');
  await expect(first).toBeFocused();
  const cursorRing = await first.evaluate((el) => getComputedStyle(el, '::after').boxShadow);
  expect(cursorRing).not.toBe('none');
  // Flush top and bottom — no gutter to bleed into there, unlike the sides.
  const ringRect = await first.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });
  const rowRect = await first.boundingBox();
  expect(Math.round(ringRect.top)).toBe(Math.round(rowRect!.y));
  expect(Math.round(ringRect.bottom)).toBe(Math.round(rowRect!.y + rowRect!.height));
  expect(await first.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');

  // ⌘-click picks it, a second ⌘-click drops it — nothing picked-looking left.
  await first.click({ modifiers: ['ControlOrMeta'] });
  await expect(first).toHaveClass(/picked/);
  await first.click({ modifiers: ['ControlOrMeta'] });
  await expect(first).not.toHaveClass(/picked/);
  expect(await first.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});
