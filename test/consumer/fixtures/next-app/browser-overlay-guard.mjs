// The navigation guard in a headless browser against `next start` (app/overlay-guard): a dialog and a sheet kept
// mounted with open={false} are no open overlays; an open dialog refuses navigation; after closing it is allowed again.
// Waits are on conditions, never fixed timeouts. Browser: CHROME_PATH, else the installed Google Chrome.
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
  await page.goto(`${baseUrl}/overlay-guard`, { waitUntil: 'networkidle' });
  const readAnswer = async (button, output) => {
    await page.evaluate(selector => { document.querySelector(selector).textContent = ''; }, output);
    await page.click(button);
    await page.waitForFunction(selector => (document.querySelector(selector)?.textContent ?? '') !== '', output);
    return page.textContent(output);
  };
  report('overlay guard: closed dialog and sheet kept mounted are no open overlays', (await readAnswer('#read-guard', '#guard-answer')) === 'allowed|0', await page.textContent('#guard-answer'));
  await page.click('#open-dialog');
  await page.waitForSelector('[role=dialog]');
  report('overlay guard: an open dialog refuses navigation', (await readAnswer('#dialog-read-guard', '#dialog-guard-answer')) === 'refused:dialog-open|1', await page.textContent('#dialog-guard-answer'));
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role=dialog]', { state: 'detached' });
  report('overlay guard: navigation is allowed again after the dialog closed', (await readAnswer('#read-guard', '#guard-answer')) === 'allowed|0', await page.textContent('#guard-answer'));
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
