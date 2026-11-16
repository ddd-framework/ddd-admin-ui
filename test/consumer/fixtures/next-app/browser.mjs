// T2, T3 and T7 in a headless browser against `next start`.
// Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome"); no browser download.
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
);
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

/**
 * Whether an element is painted on top at its centre. Radix turns off pointer events outside an open select, so
 * "clickable" alone does not prove the stacking order: hit-testing runs with pointer events forced on everywhere.
 */
const isPaintedOnTop = (locator) =>
  locator.evaluate((element) => {
    const style = document.createElement('style');
    style.textContent = '* { pointer-events: auto !important; }';
    document.head.append(style);
    try {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top !== null && element.contains(top);
    } finally {
      style.remove();
    }
  });

try {
  // T2: German after hydration, no hydration warning
  {
    const page = await browser.newPage();
    const consoleProblems = [];
    const failedResponses = [];
    page.on('response', (response) => {
      if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith('/favicon.ico')) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on('console', (message) => {
      if (/^Failed to load resource/.test(message.text())) return; // reported through failedResponses

      if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
    await page.goto(`${baseUrl}/client`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Suche zurücksetzen' }).click();
    await page.waitForFunction(() => document.querySelector('#hydrated')?.textContent === 'yes', null, { timeout: 10_000 });
    report('T2 hydrated (button handler ran)', true);
    report('T2 date cell in German', (await page.textContent('#date')) === '04.03.2026', await page.textContent('#date'));
    report('T2 translated text', (await page.textContent('#text')) === 'Suche zurücksetzen', await page.textContent('#text'));
    report('T2 number in German', (await page.textContent('#number')) === '1.234,5', await page.textContent('#number'));
    report('T2 no hydration warning or console error', consoleProblems.length === 0, consoleProblems.join(' | '));
    report('T2 no failed request', failedResponses.length === 0, failedResponses.join(' | '));
    await page.close();
  }

  // T3: server violations named by the labels the translatable and the media field registered with the form
  {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/form`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForSelector('#form-errors li', { timeout: 10_000 });
    const rows = await page.$$eval('#form-errors li', (items) => items.map((item) => item.textContent?.trim()));
    report('T3 violation on the translatable field named by its label', rows.includes('Display name: must not be blank'), rows.join(' | '));
    report('T3 violation on the media field named by its label', rows.includes('Cover image: is required'), rows.join(' | '));
    await page.close();
  }

  // T7: select inside dialog inside sheet
  {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/overlays/nested`, { waitUntil: 'networkidle' });
    await page.click('#nested-trigger', { timeout: 10_000 });
    const option = page.getByRole('option', { name: 'Beta' });
    await option.waitFor({ state: 'visible', timeout: 5_000 });
    report('T7 select list painted above dialog and sheet', await isPaintedOnTop(option));
    await option.click({ timeout: 5_000 });
    report('T7 select in dialog in sheet is clickable', (await page.textContent('#nested-value')) === 'beta');
    await page.close();
  }

  // T7: select inside a host overlay at z-index 10000 with --layer-popover: 10001
  {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/overlays/host-layer`, { waitUntil: 'networkidle' });
    await page.click('#host-trigger', { timeout: 10_000 });
    const option = page.getByRole('option', { name: 'Beta' });
    await option.waitFor({ state: 'visible', timeout: 5_000 });
    report('T7 select list painted above the z-index 10000 host overlay', await isPaintedOnTop(option));
    await option.click({ timeout: 5_000 });
    report('T7 select above a z-index 10000 host overlay (--layer-popover: 10001)', (await page.textContent('#host-value')) === 'beta');
    await page.close();
  }

  // negative control: with the default layer the list opens below the host overlay
  {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/overlays/host-layer-default`, { waitUntil: 'networkidle' });
    await page.click('#host-trigger', { timeout: 10_000 });
    const option = page.getByRole('option', { name: 'Beta' });
    await option.waitFor({ state: 'visible', timeout: 5_000 });
    const isOnTop = await isPaintedOnTop(option);
    report('T7 control: with the default layer the list is covered by the host overlay', !isOnTop);
    await page.close();
  }
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  await browser.close();
}
if (failed) process.exit(1);
