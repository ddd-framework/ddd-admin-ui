// Delta saves of translatable texts in a headless browser against `next start` (app/translation-delta, 0.3.12): a
// background translation stores a key while the form is open; the save sends only the user's change and the background
// key survives; a reload rebases the form (the new key shows, the form is clean) and keeps an unsaved edit.
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
  await page.goto(`${baseUrl}/translation-delta`, { waitUntil: 'networkidle' });
  const description = page.locator('#description-field input').first();
  await page.waitForFunction(() => document.querySelector('#description-field input')?.value === 'A bike');
  await description.fill('A blue bike');

  await page.click('#background-write');
  await page.waitForFunction(() => (document.querySelector('#server-state')?.textContent ?? '').includes('Vélo'));
  await page.click('#save');
  await page.waitForFunction(() => (document.querySelector('#payload')?.textContent ?? '') !== '');
  const payload = JSON.parse(await page.textContent('#payload'));
  report(
    'delta save: only the edited key travels, in merge mode',
    payload?.replaceExistingTranslations === false && JSON.stringify(payload.translationsStore) === JSON.stringify({ description: { 'en::FORMAL': 'A blue bike' } }),
    JSON.stringify(payload)
  );
  await page.waitForFunction(() => (document.querySelector('#server-state')?.textContent ?? '').includes('A blue bike'));
  const stored = JSON.parse(await page.textContent('#server-state'));
  report(
    'delta save: the background translation written while the form was open survives the save',
    stored.name?.['fr::FORMAL'] === 'Vélo' && stored.name?.['de::FORMAL'] === 'Fahrrad' && stored.description?.['en::FORMAL'] === 'A blue bike',
    JSON.stringify(stored)
  );

  await page.click('#reload');
  await page.waitForFunction(() => (document.querySelector('#form-state')?.textContent ?? '') !== '');
  const clean = await page.textContent('#form-state');
  report('rebase: the form shows the background key and is clean', clean.includes('Vélo') && clean.endsWith('|clean'), clean);

  await page.evaluate(() => { document.querySelector('#form-state').textContent = ''; });
  await description.fill('Edited again');
  await page.click('#background-write');
  await page.click('#reload');
  await page.waitForFunction(() => (document.querySelector('#form-state')?.textContent ?? '') !== '');
  const edited = await page.textContent('#form-state');
  report('rebase: an unsaved edit stays as typed and stays a change', edited.includes('Edited again') && edited.endsWith('|changed'), edited);
  report('rebase: the edited field still shows the typed text', (await description.inputValue()) === 'Edited again');
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
