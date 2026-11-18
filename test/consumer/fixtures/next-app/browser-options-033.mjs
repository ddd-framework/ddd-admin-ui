// The options of 0.3.3 in a headless browser against `next start` (app/options-033): the overlay edge spans header and
// body at the pinned column's edge, Shift with a press in the select cell selects a range and no page text, a pinned
// cell of a row without an action keeps the surface on hover, a dialog with isolateEvents keeps its presses from the
// React ancestors and (submitOnEnter={false}) does not submit on Enter, and one text per language keeps a leading
// space and its edited key while typing, reporting every language and the reason.
// Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome").
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleProblems = [];
  page.on('console', message => {
    if (message.type() === 'error' && /^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => consoleProblems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}/options-033`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  // the overlay edge: hidden at the start, shown at the start pin's edge after a sideways scroll, over header and body
  const scroller = page.locator('#table-host [data-entity-list-scroll]');
  const endVisible = await page.$eval('#table-host [data-list-edge-overlay="end"]', element => getComputedStyle(element).display !== 'none');
  report('overlay edge: the end edge shows while content is hidden past it', endVisible);
  const perCell = await page.$eval('#table-host [data-list-pin="end"][data-list-pin-edge]', element => getComputedStyle(element, '::before').content);
  report('overlay edge: no edge per cell', perCell === 'none' || perCell === 'normal', perCell);
  await scroller.evaluate(element => {
    element.scrollLeft = 300;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(100);
  const geometry = await page.evaluate(() => {
    const edge = document.querySelector('#table-host [data-list-edge-overlay="start"]');
    const cell = document.querySelector('#table-host thead [data-list-pin="start"][data-list-pin-edge]');
    const scrollerElement = document.querySelector('#table-host [data-entity-list-scroll]');
    const edgeRect = edge.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const scrollerRect = scrollerElement.getBoundingClientRect();
    return { display: getComputedStyle(edge).display, edgeLeft: edgeRect.left, cellRight: cellRect.right, edgeTop: edgeRect.top, top: scrollerRect.top, height: edgeRect.height, client: scrollerElement.clientHeight };
  });
  report(
    'overlay edge: one rule at the start pin from the header top through the body',
    geometry.display === 'block' && Math.abs(geometry.edgeLeft - geometry.cellRight) < 1.5 && Math.abs(geometry.edgeTop - geometry.top) < 1.5 && geometry.height > geometry.client - 2,
    JSON.stringify(geometry)
  );

  // Shift in the select cell: a range, no text selection
  const cellOf = key => page.locator('tr', { has: page.getByRole('checkbox', { name: `Select row ${key}`, exact: true }) }).locator('td').first();
  const first = await cellOf('row-2').boundingBox();
  await page.mouse.click((first?.x ?? 0) + 3, (first?.y ?? 0) + 3);
  const last = await cellOf('row-6').boundingBox();
  await page.keyboard.down('Shift');
  await page.mouse.click((last?.x ?? 0) + 3, (last?.y ?? 0) + 3);
  await page.keyboard.up('Shift');
  const keys = await page.$eval('#selection-probe', element => element.dataset.keys);
  const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  report('select cell: Shift selects the range', keys === 'row-2,row-3,row-4,row-5,row-6', keys);
  report('select cell: Shift selects no page text', selectedText === '', JSON.stringify(selectedText));

  // pinned cell of a row without an action: no hover tint
  const pinned = page.locator('tbody tr').nth(9).locator('[data-list-pin="start"]');
  const before = await pinned.evaluate(element => getComputedStyle(element).backgroundColor);
  await pinned.hover();
  await page.waitForTimeout(200);
  const after = await pinned.evaluate(element => getComputedStyle(element).backgroundColor);
  report('hover: a pinned cell of a row without an action keeps its surface', before === after, `${before} → ${after}`);

  // dialog: presses stay inside, Enter does not submit, the description takes its props
  await page.click('#open-dialog');
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Enter does not submit here.').click();
  await page.locator('#dialog-input').click();
  const presses = await page.$eval('#dialog-host', element => element.dataset.presses);
  report('dialog: pointerdown inside does not reach the React ancestors', presses === '0', presses);
  report('dialog: descriptionProps reach the description', (await page.locator('#dialog-description-probe').count()) === 1);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  report('dialog: Enter in a field does not submit (submitOnEnter={false})', (await page.$eval('#submit-probe', element => element.dataset.submits)) === '0');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(150);
  report('dialog: the submit button still submits', (await page.$eval('#submit-probe', element => element.dataset.submits)) === '1');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });

  // one text per language: the edited key stays while FORMAL is emptied, a leading space is typable
  const field = page.locator('input[placeholder="Enter DE text…"]').first();
  await field.fill('');
  await page.waitForTimeout(100);
  const emptied = await page.$eval('#texts-probe', element => ({ texts: JSON.parse(element.dataset.texts), store: JSON.parse(element.dataset.store), reason: element.dataset.reason }));
  report('language input: emptying FORMAL keeps editing FORMAL (no switch to INFORMAL)', (await field.inputValue()) === '' && emptied.texts.de === '', JSON.stringify(emptied));
  report('language input: the store keeps INFORMAL and drops the blank FORMAL', emptied.store['de::INFORMAL'] === 'Hallo du' && !('de::FORMAL' in emptied.store), JSON.stringify(emptied.store));
  report('language input: the reason is edit', emptied.reason === 'edit', emptied.reason);
  await field.pressSequentially(' Hi');
  await page.waitForTimeout(100);
  const typed = await page.$eval('#texts-probe', element => JSON.parse(element.dataset.texts));
  report('language input: a leading space is typable and reported', (await field.inputValue()) === ' Hi' && typed.de === ' Hi', `${await field.inputValue()} ${JSON.stringify(typed)}`);
  report('language input: every language of the store is named', 'en' in typed && 'de' in typed);

  // 390 px: no horizontal page overflow
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  report('390 px: no horizontal page overflow', overflow <= 0, String(overflow));

  report('no console errors or hydration warnings', consoleProblems.length === 0, consoleProblems.join(' | '));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
