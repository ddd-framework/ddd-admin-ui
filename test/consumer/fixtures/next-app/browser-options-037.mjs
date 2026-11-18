// The options of 0.3.7 in a headless browser against `next start` (app/options-037): several languages in "has a value
// in" reach the list request as `in`, the card view's sort select changes the order of the request, and the
// confirmation of "Generate all missing" shows the host's estimate after its loading state.
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
  await page.goto(`${baseUrl}/options-037`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const listArgs = () => page.evaluate(() => window.__options037ListArgs ?? null);
  const initial = await listArgs();
  report(
    'languages: several ids reach the root filter and the expand as `in`',
    initial?.filters === 'appTranslationValues.languageId in ["1","2"]' && initial?.expand === 'appTranslationValues(filters=languageId in ["1","2"])',
    JSON.stringify(initial)
  );

  // the card view's sort select
  const sortSelect = page.getByRole('combobox', { name: 'Sort by' });
  report('card sort: the select shows in the card view', (await sortSelect.count()) === 1);
  await sortSelect.click();
  await page.getByRole('option', { name: 'Key, ascending' }).click();
  await page.waitForTimeout(600);
  const sorted = await listArgs();
  report('card sort: picking "Key, ascending" sorts the request', sorted?.orderBy === 'key ASC, id ASC', JSON.stringify(sorted));

  // the generation estimate in the confirmation
  await page.getByRole('button', { name: 'Generate all missing' }).click();
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
  await dialog.first().waitFor();
  const loading = await page.locator('[data-slot="translation-generation-estimate"][data-state="loading"]').count();
  report('estimate: the confirmation shows the loading state first', loading === 1);
  await page.locator('[data-host-estimate]').waitFor({ timeout: 5000 });
  const estimateText = await page.locator('[data-host-estimate]').textContent();
  report('estimate: the host content follows with the loaded preview', /Host estimate: 42 keys \(all\)/.test(estimateText ?? ''), estimateText ?? '');
  await dialog.first().getByRole('button', { name: 'Cancel' }).click();
  // the dialog keeps its content through the close animation
  const closed = await page
    .locator('[data-host-estimate]')
    .waitFor({ state: 'detached', timeout: 3000 })
    .then(() => true, () => false);
  report('estimate: cancel closes the confirmation', closed);

  report('options 0.3.7: no console error or hydration warning', consoleProblems.length === 0, consoleProblems.join(' | '));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
