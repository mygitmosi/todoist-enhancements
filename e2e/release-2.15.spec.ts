import { test as plain, expect as plainExpect } from '@playwright/test';
import { test, expect, go, row } from './demo';

/**
 * 2.15.0, the phone: the shell, the bottom sheets, the task panel and the
 * composer, the sign-in and the invitation to install (#273, #291 to #295).
 */
const PHONE = { width: 390, height: 844 };

/** A sheet slides in: measured once it has stopped. */
const settled = async (sheet: import('@playwright/test').Locator) => {
  await expect.poll(async () => {
    const first = (await sheet.boundingBox())!.y;
    await sheet.page().waitForTimeout(120);
    return Math.abs((await sheet.boundingBox())!.y - first) < 0.5;
  }).toBe(true);
};

test.describe('the phone shell (#291)', () => {
  test.use({ viewport: PHONE });

  test('the tab bar says one short word each, on one line', async ({ demo: page }) => {
    const labels = await page.locator('.mobile-nav button:not(.fab)').allInnerTexts();
    expect(labels.map((text) => text.trim())).toEqual(['Inbox', 'Week', 'Upcoming', 'Someday']);
    for (const button of await page.locator('.mobile-nav button:not(.fab)').all()) {
      const lines = await button.evaluate((el) => Math.round(el.getBoundingClientRect().height / 14));
      expect(lines).toBeLessThan(6);
    }
  });

  test('the bar grows and names the page once the page has scrolled, and stays solid', async ({ demo: page }) => {
    await go(page, '#/week');
    await expect(page.locator('.mobile-top')).not.toHaveClass(/scrolled/);
    await page.evaluate(() => { document.querySelector('.screen.active')!.scrollTop = 320; });
    await expect(page.locator('.mobile-top')).toHaveClass(/scrolled/);
    await expect(page.locator('.mobile-top strong')).toHaveClass(/shown/);
    // A plain bar: solid, never translucent.
    const bar = await page.locator('.mobile-top').evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).backdropFilter]);
    expect(bar[0]).not.toMatch(/rgba\(.*, 0\)$/);
    expect(bar[1]).toBe('none');
  });

  test('Display and Insights are round buttons on the title line, still named', async ({ demo: page }) => {
    await go(page, '#/week');
    const title = await page.locator('.screen.active .ptitle').boundingBox();
    for (const name of ['Display', 'Insights']) {
      const button = page.locator('.screen.active .pactions').getByRole('button', { name });
      const box = (await button.boundingBox())!;
      expect(Math.round(box.width)).toBe(40);
      expect(Math.abs(box.y + box.height / 2 - (title!.y + title!.height / 2))).toBeLessThan(24);
    }
  });

  test('the navigation page has rows of 40px and no keyboard hints', async ({ demo: page }) => {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const nav = page.locator('.browse .sidebar-sheet');
    const height = await nav.locator('.navitem').first().evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBe(40);
    await expect(nav.locator('.searchbtn kbd')).toBeHidden();
  });
});

test.describe('bottom sheets (#293)', () => {
  test.use({ viewport: PHONE });

  test('Display comes up from the bottom with a scrim, and closes from Done, the scrim or the cross', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const panel = page.locator('.displaypanel');
    const open = () => page.locator('.screen.active .pactions').getByRole('button', { name: 'Display' }).click();

    await open();
    await expect(panel).toBeVisible();
    // It slides up: measured once it has arrived.
    await expect.poll(async () => { const b = (await panel.boundingBox())!; return Math.round(b.y + b.height); }).toBe(PHONE.height);
    const box = (await panel.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(PHONE.width);
    await expect(page.locator('.sheet-scrim')).toBeVisible();
    await panel.getByRole('button', { name: 'Done' }).click();
    await expect(panel).toHaveCount(0);

    await open();
    await page.locator('.sheet-scrim').click({ position: { x: 20, y: 20 } });
    await expect(panel).toHaveCount(0);

    await open();
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toHaveCount(0);
  });

  test('every control of the Display sheet stays inside the screen', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await page.locator('.screen.active .pactions').getByRole('button', { name: 'Display' }).click();
    const outside = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.displaypanel button, .displaypanel .fselect-face'))
      .filter((el) => el.getBoundingClientRect().width > 0)
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 || el.getBoundingClientRect().left < -1).length);
    expect(outside).toBe(0);
  });

  test('What\'s new is a sheet with its buttons on a band of their own, the badge above the title', async ({ demo: page }) => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog')));
    const sheet = page.locator('.sheet:has(> .whatsnew)');
    await expect(sheet).toBeVisible();
    await settled(sheet);
    const body = (await sheet.locator('.whatsnew-body').boundingBox())!;
    const foot = (await sheet.locator('.whatsnew-foot').boundingBox())!;
    expect(foot.y).toBeGreaterThanOrEqual(body.y + body.height - 1);
    const badge = (await sheet.locator('.whatsnew-badge').first().boundingBox())!;
    const title = (await sheet.locator('.whatsnew-title').first().boundingBox())!;
    expect(badge.y + badge.height).toBeLessThanOrEqual(title.y + 1);
    await expect(sheet.locator('.whatsnew-foot .coffee-short')).toBeVisible();
    await expect(sheet.locator('.whatsnew-foot .coffee-long')).toBeHidden();
  });

  test('Search is a page of its own with Cancel, and no keyboard hints', async ({ demo: page }) => {
    await page.getByRole('button', { name: 'Search' }).first().click();
    const sheet = page.locator('.sheet-search');
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.width)).toBe(PHONE.width);
    expect(Math.round(box.height)).toBe(PHONE.height);
    await expect(sheet.locator('.searchfield kbd')).toBeHidden();
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toHaveCount(0);
  });

  test('a sheet is put away by a swipe down on its grip', async ({ demo: page }) => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog')));
    const grip = page.locator('.sheet:has(> .whatsnew) .sheet-grip');
    const box = (await grip.boundingBox())!;
    await grip.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: box.x + 40, clientY: box.y + 8, isPrimary: true });
    await grip.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: box.x + 40, clientY: box.y + 260, isPrimary: true });
    await grip.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: box.x + 40, clientY: box.y + 260, isPrimary: true });
    await expect(page.locator('.sheet:has(> .whatsnew)')).toHaveCount(0);
  });
});

test.describe('the task panel and the composer (#294)', () => {
  test.use({ viewport: PHONE });

  test('a task opens as a full-width sheet: its properties on one row, the comment bar held at the bottom', async ({ demo: page }) => {
    await go(page, '#/week');
    await row(page, 'Check the quote before sending').locator('.ttitle').click();
    const sheet = page.locator('.sheet:has(> .detail-top)');
    await expect(sheet).toBeVisible();
    await settled(sheet);
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.width)).toBe(PHONE.width);
    expect(Math.round(box.y + box.height)).toBe(PHONE.height);

    const chips = sheet.locator('.propchips');
    await expect(chips).toBeVisible();
    // The date has a line of its own, above the chips.
    const date = (await sheet.locator('[data-prop="start"]').boundingBox())!;
    const first = (await chips.boundingBox())!;
    expect(first.y).toBeGreaterThanOrEqual(date.y + date.height);
    // One row of chips: priority is a single chip, not four pills.
    await expect(chips.locator('.priopill')).toHaveCount(0);
    await expect(chips.getByRole('button', { name: /Priority/ })).toBeVisible();

    const field = (await sheet.locator('.comment-new').boundingBox())!;
    expect(Math.round(field.y + field.height)).toBeGreaterThan(PHONE.height - 60);
  });

  test('the new task window sits at the foot of the screen with a round send button in view', async ({ demo: page }) => {
    await page.getByRole('button', { name: 'Add task' }).last().click();
    const sheet = page.locator('.sheet:has(> .composerbox)');
    await expect(sheet).toBeVisible();
    await settled(sheet);
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(PHONE.height);
    const send = sheet.locator('.composer-actions .btn.primary');
    await expect(send).toBeVisible();
    const size = (await send.boundingBox())!;
    expect(Math.round(size.width)).toBe(44);
    await expect(send).toHaveAccessibleName('Add task');
    // The project chip is on the bar beside it, not in the row of chips.
    await expect(sheet.locator('.composer-actions .composer-place')).toBeVisible();
  });

  test('the sheet follows the keyboard', async ({ demo: page }) => {
    await page.getByRole('button', { name: 'Add task' }).last().click();
    const sheet = page.locator('.sheet:has(> .composerbox)');
    await expect(sheet).toBeVisible();
    await page.evaluate(() => document.documentElement.style.setProperty('--kb', '300px'));
    await expect.poll(async () => Math.round((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height)).toBe(PHONE.height - 300);
  });
});

test.describe('Table, Calendar, Dashboard and board on a phone (#295)', () => {
  test.use({ viewport: PHONE });

  const view = async (page: import('@playwright/test').Page, mode: string) => {
    await page.locator('.screen.active .pactions').getByRole('button', { name: 'Display' }).click();
    await page.locator('.displaypanel .display-modes').getByRole('button', { name: mode, exact: true }).click();
    await page.locator('.displaypanel').getByRole('button', { name: 'Done' }).click();
  };

  test('the table pins a narrow title and lets the other columns slide', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await view(page, 'Table');
    const title = (await page.locator('.task-table .tmain').first().boundingBox())!;
    expect(title.width).toBeLessThan(PHONE.width * 0.5);
    await expect(page.locator('.table-scroll')).toBeVisible();
  });

  test('the calendar has no scroll of its own, and says "All day" in one short word', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await view(page, 'Calendar');
    await expect(page.locator('.calendar-scroll')).toHaveCSS('overflow-y', 'visible');
    const label = page.locator('.calendar-all-day > div').first();
    expect((await label.boundingBox())!.height).toBeLessThan(44);
  });

  test('the dashboard period is one control, and its list reads top to bottom', async ({ demo: page }) => {
    await go(page, '#/insights');
    await expect(page.locator('.spanbar')).toHaveCount(0);
    const select = page.locator('.periodbar .fselect-face');
    await expect(select).toBeVisible();
    await select.click();
    await expect(page.getByRole('option')).toHaveCount(6);
  });

  test('the board shows the edge of the next column and dots for where you are', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await view(page, 'Board');
    const dots = page.locator('.boarddots i');
    expect(await dots.count()).toBeGreaterThan(1);
    await expect(dots.first()).toHaveClass(/on/);
    const first = (await page.locator('.board > *').first().boundingBox())!;
    expect(first.width).toBeLessThan(PHONE.width - 20);
    await page.locator('.board').evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await expect(dots.last()).toHaveClass(/on/);
  });
});

/** Opens the app again, as a phone does: the demo is still there, or the sign-in is. */
const reopen = async (page: import('@playwright/test').Page) => {
  await page.reload();
  await page.locator('.mobile-nav, .signin').first().waitFor();
  const explore = page.getByRole('button', { name: 'Explore with demo data' });
  if (await explore.isVisible()) await explore.click();
};

test.describe('the invitation to install (#273)', () => {
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  test.use({ viewport: PHONE, userAgent: IOS, hasTouch: true });

  test('it waits for a second visit, then shows three steps, and "Later" puts it away', async ({ demo: page }) => {
    // The first opening counted one visit: nothing yet.
    await page.waitForTimeout(3200);
    await expect(page.getByRole('dialog', { name: 'Install the app' })).toHaveCount(0);

    await page.evaluate(() => { localStorage.setItem('installPrompt.visits', '2'); });
    await page.evaluate(() => sessionStorage.removeItem('installPrompt.counted'));
    await reopen(page);
    const dialog = page.getByRole('dialog', { name: 'Install the app' });
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(dialog.locator('.install-steps li')).toHaveCount(3);
    await dialog.getByRole('button', { name: 'Later' }).click();
    await expect(dialog).toHaveCount(0);
    expect(Number(await page.evaluate(() => localStorage.getItem('installPrompt.snoozedUntil')))).toBeGreaterThan(Date.now());
  });

  test('"Got it" is final', async ({ demo: page }) => {
    await page.evaluate(() => { localStorage.setItem('installPrompt', 'force'); });
    await reopen(page);
    const dialog = page.getByRole('dialog', { name: 'Install the app' });
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await dialog.getByRole('button', { name: 'Got it' }).click();
    expect(await page.evaluate(() => localStorage.getItem('installPrompt.done'))).toBe('1');
  });
});

plain.describe('the sign-in on a phone (#292)', () => {
  plain.use({ viewport: PHONE });

  plain('the promise and the app are on top, the way in is a sheet, the privacy text is one tap away', async ({ page }) => {
    await page.goto('/');
    await plainExpect(page.getByRole('heading', { level: 2 })).toBeVisible();
    const sheet = (await page.locator('.signin-main').boundingBox())!;
    plainExpect(Math.round(sheet.y + sheet.height)).toBe(PHONE.height);
    // The Todoist button carries Todoist's mark, and the demo button is one line.
    await plainExpect(page.locator('.connect-submit .tdlogo')).toBeVisible();
    plainExpect((await page.locator('.connect-demo').boundingBox())!.height).toBeLessThan(60);
    await page.locator('.connect-privacy-line').getByRole('button', { name: 'Privacy' }).click();
    const privacy = page.getByRole('dialog', { name: 'Privacy' });
    await plainExpect(privacy).toBeVisible();
    await plainExpect(privacy.getByText('Private by design')).toBeVisible();
  });
});
