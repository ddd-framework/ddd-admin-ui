// The options of 0.3.9 in a headless browser against `next start` (app/options-039): the selection cell of a table with
// tracks takes its track and centres the checkbox, a press anywhere in the select-all cell selects every row, a group
// row with its own page tints as a whole, the mobile menu is described, a broken avatar falls back to its initials,
// the language menu reports the current language again, a node description goes to the package dialog while text goes
// to the host's service, and "Generate all missing" starts without asking when the estimate renderer answers null.
// Waits are on conditions, never fixed timeouts.
// Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome").
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};
const settles = promise => promise.then(() => true, () => false);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleProblems = [];
  page.on('console', message => {
    if (message.type() === 'error' && /^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => consoleProblems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}/options-039`, { waitUntil: 'networkidle' });
  // hydrated: the table has measured its tracks (the layout template is in px)
  await page.waitForFunction(() => /56px/.test(document.querySelector('#track-table table')?.getAttribute('style') ?? ''));

  // the selection cell of a table with tracks
  const cell = await page.$eval('#track-table tbody tr td', element => {
    const box = element.getBoundingClientRect();
    const checkbox = element.querySelector('[role="checkbox"]');
    const checkboxBox = checkbox?.getBoundingClientRect();
    return {
      width: Math.round(box.width),
      transform: checkbox ? getComputedStyle(checkbox).transform : 'none',
      offset: checkboxBox ? Math.round(checkboxBox.top + checkboxBox.height / 2 - (box.top + box.height / 2)) : 99,
    };
  });
  report('track table: the selection cell takes its 56 px track', cell.width === 56, JSON.stringify(cell));
  report('track table: the checkbox sits centred without the table-cell offset', (cell.transform === 'none' || cell.transform === 'matrix(1, 0, 0, 1, 0, 0)') && Math.abs(cell.offset) <= 1, JSON.stringify(cell));

  // a press in the select-all cell, away from its checkbox
  const header = await page.locator('#track-table thead th').first().boundingBox();
  await page.mouse.click((header?.x ?? 0) + (header?.width ?? 0) - 3, (header?.y ?? 0) + 4);
  const allSelected = await settles(
    page.waitForFunction(() => document.getElementById('selection-probe')?.dataset.keys === 'row-1,row-2,row-3,row-4,row-5,row-6', null, { timeout: 3000 })
  );
  report('select-all cell: a press in the cell selects every row', allSelected, await page.$eval('#selection-probe', element => element.dataset.keys ?? ''));
  await page.mouse.click((header?.x ?? 0) + (header?.width ?? 0) - 3, (header?.y ?? 0) + 4);
  const noneSelected = await settles(page.waitForFunction(() => document.getElementById('selection-probe')?.dataset.keys === '', null, { timeout: 3000 }));
  report('select-all cell: a second press clears the selection', noneSelected);

  // the group row tints as a whole while the pointer is on its caret
  const row = page.locator('[data-shell-sidebar] [data-nav-group-row="row"]').first();
  const rowBefore = await row.evaluate(element => getComputedStyle(element).backgroundColor);
  await row.locator('button').hover();
  const rowTinted = await settles(
    page.waitForFunction(
      before => {
        const element = document.querySelector('[data-shell-sidebar] [data-nav-group-row="row"]');
        return element !== null && getComputedStyle(element).backgroundColor !== before;
      },
      rowBefore,
      { timeout: 3000 }
    )
  );
  const linkBackground = await row.locator('a').evaluate(element => getComputedStyle(element).backgroundColor);
  report('group row: the whole row tints while the pointer is on the caret', rowTinted, rowBefore);
  report('group row: the label link does not tint on its own', linkBackground === 'rgba(0, 0, 0, 0)' || linkBackground === 'transparent', linkBackground);

  // the broken avatar shows the initials
  const trigger = page.locator('[data-shell-account-menu]');
  const initials = await settles(
    page.waitForFunction(() => {
      const element = document.querySelector('[data-shell-account-menu]');
      return element !== null && element.querySelector('img') === null && /AE/.test(element.textContent ?? '');
    }, null, { timeout: 5000 })
  );
  report('account: a failing avatar image falls back to the initials', initials, await trigger.innerHTML());

  // the language menu reports the current language again
  await page.locator('[data-shell-language-menu]').click();
  await page.getByRole('menuitemradio', { name: 'English' }).click();
  const reselected = await settles(page.waitForFunction(() => document.getElementById('reselect-probe')?.dataset.count === '1', null, { timeout: 3000 }));
  report('language menu: allowReselect reports the current language', reselected);

  // a node description goes to the package dialog, text to the host's service
  await page.click('#confirm-node');
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
  const nodeShown = await settles(page.locator('#confirm-node-list').waitFor({ timeout: 3000 }));
  report('confirm: a node description opens the package dialog with the node', nodeShown);
  if (nodeShown) {
    await dialog.first().getByRole('button', { name: 'Go' }).click();
    const answered = await settles(page.waitForFunction(() => document.getElementById('confirm-answer')?.dataset.answer === 'true', null, { timeout: 3000 }));
    report('confirm: the package dialog answers', answered);
    await page.locator('#confirm-node-list').waitFor({ state: 'detached', timeout: 3000 });
  }
  await page.click('#confirm-text');
  const hostCalled = await settles(
    page.waitForFunction(() => document.getElementById('host-confirm-probe')?.dataset.calls === '1:Plain text', null, { timeout: 3000 })
  );
  report('confirm: a text description goes to the host service', hostCalled, await page.$eval('#host-confirm-probe', element => element.dataset.calls ?? ''));

  // "Generate all missing" with confirmGenerateAll="auto" and a renderer answering null: no dialog
  await page.getByRole('button', { name: 'Generate all missing' }).click();
  const started = await settles(page.getByText(/Generation started/).first().waitFor({ timeout: 5000 }));
  const asked = await page.getByRole('alertdialog').or(page.getByRole('dialog')).count();
  report('generate all: the renderer answered null, the generation starts without a dialog', started && asked === 0, `started ${started}, dialogs ${asked}`);

  // the mobile menu is described
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-shell-menu-button]').waitFor({ state: 'visible' });
  await page.locator('[data-shell-menu-button]').click();
  const menu = page.locator('[data-shell-mobile-menu]');
  await menu.waitFor();
  const described = await menu.evaluate(element => {
    const id = element.getAttribute('aria-describedby');
    return id ? (document.getElementById(id)?.textContent ?? '') : '';
  });
  report('mobile menu: the description is wired as aria-describedby', described === 'Every page of the fixture', described);

  report('options 0.3.9: no console error or hydration warning', consoleProblems.length === 0, consoleProblems.join(' | '));
} catch (error) {
  report('options 0.3.9 browser run', false, error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
