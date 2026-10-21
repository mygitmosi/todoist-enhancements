import { expect, go, test } from './demo';

test('the Filters page lists the saved filters with their counts (#201)', async ({ demo: page }) => {
  await go(page, '#/filters');
  const cards = page.locator('.screen.active .tagcard');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('task');
  // The sidebar entry is there, and starred filters sit in Favourites.
  await expect(page.locator('.navitem', { hasText: 'Filters' }).first()).toBeVisible();
  await expect(page.locator('.navitem.tagitem', { hasText: 'Urgent' })).toBeVisible();
});

test('a filter with commas shows one list per part, without its query on the page (#201)', async ({ demo: page }) => {
  await go(page, '#/filter/f3');
  await expect(page.locator('.screen.active .phead input').first()).toHaveValue('Overdue, then today');
  await expect(page.locator('.screen.active').getByText('overdue, today')).toHaveCount(0);
  await expect(page.locator('.screen.active .page .gname').filter({ hasText: /^Overdue$/ })).toBeVisible();
  await expect(page.locator('.screen.active .page .gname').filter({ hasText: /^Today$/ })).toBeVisible();
});

test('a filter can be created and deleted from the app (#201)', async ({ demo: page }) => {
  await go(page, '#/filters');
  await page.getByRole('button', { name: 'New filter' }).click();
  await page.getByLabel('Filter name').fill('Waiting on others');
  await page.getByLabel('Query').fill('@waiting');
  await page.getByRole('button', { name: 'Create filter' }).click();
  const card = page.locator('.screen.active .tagcard', { hasText: 'Waiting on others' });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Filter actions' }).click();
  await page.getByRole('menuitemradio', { name: 'Delete filter' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete filter' }).click();
  await expect(card).toHaveCount(0);
});

test('a tag’s colour changes from its menu (#214)', async ({ demo: page }) => {
  await go(page, '#/labels');
  const card = page.locator('.screen.active .tagcard', { hasText: 'week' });
  const mark = card.locator('.tagcard-mark');
  const before = await mark.evaluate((node) => getComputedStyle(node).color);
  await card.getByRole('button', { name: 'Tag actions' }).click();
  await page.getByRole('menuitemradio', { name: 'Edit tag' }).click();
  await page.getByRole('radio', { name: 'Blue', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => mark.evaluate((node) => getComputedStyle(node).color)).not.toBe(before);
});
