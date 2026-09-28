import { test, expect, go, rows } from './demo';

test('#104 ▲ ▼ and J / K walk the list from the task panel, and Esc lands on the last one', async ({ demo: page }) => {
  await go(page, '#/inbox');
  const titles = await rows(page).locator('.ttitle').allInnerTexts();
  await rows(page).first().locator('.ttitle').click();
  const shown = page.locator('.crumbself .crumbhere');
  await expect(shown).toHaveText(titles[0]);

  await expect(page.getByRole('button', { name: 'Previous task' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next task' }).click();
  await expect(shown).toHaveText(titles[1]);
  await page.keyboard.press('j');
  await expect(shown).toHaveText(titles[2]);
  await page.keyboard.press('ArrowUp');
  await expect(shown).toHaveText(titles[1]);

  // Typing in the description keeps its arrows.
  await page.locator('.descview').click();
  await page.keyboard.press('ArrowDown');
  await expect(shown).toHaveText(titles[1]);
  await page.keyboard.press('Escape');

  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-top')).toHaveCount(0);
  await expect(rows(page).nth(1)).toBeFocused();
});
