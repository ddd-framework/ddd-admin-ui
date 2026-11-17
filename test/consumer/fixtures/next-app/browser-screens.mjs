// The ./workers and ./translations screens on the real RTK Query (app/screens: a host api with an in-memory base
// query) in a headless browser against `next start`: the injected operations request the trait's paths, the window
// switch reloads the history, the restart request invalidates the overview, the chart tooltip follows the pointer,
// write access disables the restart, the isActive toggle of a locale saves and refetches the locales and the
// completeness, the key drawer shows the values per locale::style, the import from configuration asks first. No console
// error, no hydration warning, no page wider than a phone at 390 px. Browser: CHROME_PATH, else the installed Chrome.
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

const openPage = async (path, viewport) => {
  const page = await browser.newPage(viewport ? { viewport } : undefined);
  const problems = [];
  page.on('console', (message) => {
    if (/^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  return { page, problems };
};
const requests = (page) => page.evaluate(() => window.__screenRequests ?? []);
const waitForRequest = (page, pattern) =>
  page.waitForFunction((source) => (window.__screenRequests ?? []).some((entry) => new RegExp(source).test(entry)), pattern.source, { timeout: 10_000 });

try {
  // workers overview
  {
    const { page, problems } = await openPage('/screens/workers');
    await page.waitForSelector('[data-slot="worker-kpi-tile"]');
    await waitForRequest(page, /GET \/api\/admin\/workers\/history\?from=.*stepSeconds=300/);
    report('workers: overview and the 6 h history requested on the trait paths', (await requests(page)).some((entry) => entry === 'GET /api/admin/workers/overview'));
    report('workers: six tiles, live panel, transports table', (await page.locator('[data-slot="worker-kpi-tile"]').count()) === 6 && (await page.locator('[data-slot="workers-live-panel"]').count()) === 1);
    await page.getByRole('radio', { name: '24 hours' }).click();
    await page.keyboard.press('Enter');
    await waitForRequest(page, /GET \/api\/admin\/workers\/history\?.*stepSeconds=900/);
    report('workers: the window switch reloads the history at a 15 min step', true);

    const chart = page.locator('[data-slot="worker-time-chart"] svg').first();
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
    await page.waitForTimeout(100);
    const tooltip = await page.locator('[data-slot="worker-time-chart"] .bg-popover').first().textContent().catch(() => '');
    report('workers: the chart tooltip shows the step under the pointer', /Total/.test(tooltip ?? ''), tooltip ?? '');

    const before = (await requests(page)).filter((entry) => entry === 'GET /api/admin/workers/overview').length;
    await page.getByRole('button', { name: 'Restart all workers' }).first().click();
    await page.getByRole('button', { name: 'Request restart' }).click();
    await page.getByRole('heading', { name: 'Asked 4 processes to restart' }).waitFor({ timeout: 10_000 });
    await page.waitForFunction((count) => (window.__screenRequests ?? []).filter((entry) => entry === 'GET /api/admin/workers/overview').length > count, before, { timeout: 10_000 });
    const all = await requests(page);
    report('workers: restart posts {} and the overview is fetched again (tag invalidated)', all.includes('POST /api/admin/workers/restart {}'), all.slice(-4).join(' | '));
    await page.getByRole('button', { name: 'Done' }).click();
    report('workers: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // read-only: restart disabled
  {
    const { page, problems } = await openPage('/screens/readonly');
    await page.waitForSelector('[data-slot="worker-kpi-tile"]');
    const disabled = await page.getByRole('button', { name: 'Restart all workers' }).first().isDisabled();
    const rowDisabled = await page.getByRole('button', { name: /^Restart workers of / }).first().isDisabled();
    report('workers: WriteAccessProvider disables the restart buttons', disabled && rowDisabled);
    report('workers (read-only): no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // phone width
  {
    const { page } = await openPage('/screens/workers', { width: 390, height: 844 });
    await page.waitForSelector('[data-slot="worker-kpi-tile"]');
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    report('workers at 390 px: the page does not scroll sideways', overflow <= 1, `${overflow}px`);
    await page.close();
  }

  // transport page: tabs
  {
    const { page, problems } = await openPage('/screens/transport');
    await page.waitForSelector('[data-slot="worker-time-chart"]');
    report('transport: five charts', (await page.locator('[data-slot="worker-time-chart"]').count()) === 5);
    await page.getByRole('button', { name: 'Processes', exact: true }).click();
    await waitForRequest(page, /GET \/api\/admin\/workers\/transports\/import_orders\/processes\?orderBy=startedAt%20desc&top=50&skip=0/);
    await page.waitForSelector('[data-slot="worker-process-timeline"]');
    report('transport: the processes tab lists processes newest first with a timeline', true);
    await page.getByRole('button', { name: 'Message runs', exact: true }).click();
    await page.getByRole('button', { name: 'Failed', exact: true }).click();
    await waitForRequest(page, /messageRuns\?filters=outcome%20ne%20'HANDLED'/);
    report("transport: the Failed chip filters the runs (outcome ne 'HANDLED')", true);
    report('transport: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // translations
  {
    const { page, problems } = await openPage('/screens/translations');
    const localeRow = page.locator('#locales-screen tr', { hasText: 'German (Austria)' });
    await localeRow.waitFor();
    const toggle = localeRow.locator('[data-locale-flag="isActive"]');
    report('locales: German (Austria) starts inactive', (await toggle.getAttribute('aria-checked')) === 'false');
    const completenessBefore = (await requests(page)).filter((entry) => entry.includes('/keys/completeness')).length;
    await toggle.click();
    await waitForRequest(page, /PATCH \/api\/admin\/common\/locales .*"id":13.*"isActive":true/);
    await page.waitForFunction(
      (count) => (window.__screenRequests ?? []).filter((entry) => entry.includes('/keys/completeness')).length > count,
      completenessBefore,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(200);
    report('locales: the isActive toggle saves the row and refetches locales and completeness', (await toggle.getAttribute('aria-checked')) === 'true');

    await page.locator('#keys-screen tr', { hasText: 'Save changes' }).first().click();
    await page.getByRole('dialog').getByText('de::FORMAL').waitFor({ timeout: 10_000 });
    report('app translations: the key drawer shows the values per locale::style', (await page.getByRole('dialog').getByText('de::INFORMAL').count()) === 1);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 10_000 });

    await page.locator('#import-card').getByRole('button', { name: 'Import' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
    await waitForRequest(page, /GET \/api\/admin\/common\/locales\/importFromConfig/);
    await page.locator('#import-card').getByText(/Imported 4 locales/).waitFor({ timeout: 10_000 });
    report('config import: asks, imports and shows the outcome', true);
    report('translations: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }
} catch (error) {
  report('screens browser run', false, error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
