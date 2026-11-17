// The options of 0.3.2 in a headless browser against `next start` (app/options): Shift selects a range, the select
// cell is a hit target, the page-sticky header stays on screen and follows the body's sideways scroll, a dialog with
// isolateEvents keeps its clicks from the React ancestors and shows its result, the segmented control's current tone,
// and no horizontal page overflow at 390 px.
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleProblems = [];
  page.on('console', message => {
    if (message.type() === 'error' && /^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => consoleProblems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}/options`, { waitUntil: 'networkidle' });

  // range selection
  await page.getByRole('checkbox', { name: 'Select row row-2', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select row row-5', exact: true }).click({ modifiers: ['Shift'] });
  const range = await page.$eval('#selection-probe', element => element.dataset.keys);
  report('range: Shift selects from the anchor to the clicked row', range === 'row-2,row-3,row-4,row-5', range);
  await page.getByRole('checkbox', { name: 'Select row row-4', exact: true }).click({ modifiers: ['Shift'] });
  const shrunk = await page.$eval('#selection-probe', element => element.dataset.keys);
  report('range: Shift on a selected row clears the range up to it', shrunk === 'row-5', shrunk);

  // the select cell as a hit target (a click beside the checkbox)
  const cell = page.locator('tr', { has: page.getByRole('checkbox', { name: 'Select row row-8', exact: true }) }).locator('td').first();
  const box = await cell.boundingBox();
  await page.mouse.click((box?.x ?? 0) + 3, (box?.y ?? 0) + 3);
  const withCell = await page.$eval('#selection-probe', element => element.dataset.keys);
  report('hit area: a click in the select cell beside the checkbox toggles the row', withCell === 'row-5,row-8', withCell);

  // the header sticks to the page and follows the body's sideways scroll
  await page.setViewportSize({ width: 700, height: 600 });
  await page.evaluate(() => window.scrollTo(0, 900));
  const headerTop = await page.$eval('[data-list-sticky-header]', element => element.getBoundingClientRect().top);
  report('page header: stays at the top of the page while the page scrolls', Math.abs(headerTop) < 1.5, String(headerTop));
  await page.$eval('[data-list-page-header] [data-entity-list-scroll]', element => {
    element.scrollLeft = 200;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(100);
  const followed = await page.$eval('[data-list-sticky-header]', element => element.scrollLeft);
  report('page header: follows the body scroller sideways', Math.abs(followed - 200) < 1, String(followed));
  await page.evaluate(() => window.scrollTo(0, 0));

  // the dialog keeps its clicks inside and shows its result
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('#open-dialog');
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Plain text inside the dialog').click();
  const outside = await page.$eval('#dialog-host', element => element.dataset.outsideClicks);
  report('dialog: a click inside does not reach the React ancestors', outside === '0', outside);
  report('dialog: data attributes reach the content', (await page.locator('[data-probe="options-dialog"]').count()) === 1);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await page.waitForSelector('#dialog-result');
  report('dialog: the result replaces the fields, one Close button', (await dialog.getByRole('button', { name: 'Close', exact: true }).count()) >= 1 && (await dialog.getByRole('button', { name: 'Create' }).count()) === 0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
  report('dialog: Close closes it', true);

  // the segmented control's current tone follows the bar's text colour
  const colours = await page.$eval('#bar [data-slot="segmented-control"]', element => ({
    bar: getComputedStyle(element.parentElement).color,
    control: getComputedStyle(element).color,
  }));
  report('segmented: the current tone takes the bar text colour', colours.bar === colours.control, JSON.stringify(colours));

  // 390 px: the table scrolls inside itself, the page does not
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  report('390 px: no horizontal page overflow', overflow <= 0, String(overflow));

  report('no console errors or hydration warnings', consoleProblems.length === 0, consoleProblems.join(' | '));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
