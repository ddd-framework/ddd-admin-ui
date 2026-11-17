// The ./issues, ./database and ./crons screens on the real RTK Query (app/operations: one host api per entry with an
// in-memory base query that records every request on `window.__operationsRequests`) in a headless browser against
// `next start`. Each entry's checks live in browser-operations/<entry>.mjs and get the helpers below. Every page is
// also checked at 390 px with the CPU throttled 6x (a slow phone): the page never scrolls sideways. No console error,
// no hydration warning. Browser: CHROME_PATH, else the installed Chrome.
import { chromium } from 'playwright-core';

import { run as runCrons } from './browser-operations/crons.mjs';
import { run as runDatabase } from './browser-operations/database.mjs';
import { run as runIssues } from './browser-operations/issues.mjs';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

/** Opens `path`; `problems` collects console errors, hydration warnings and page errors. */
const openPage = async (path, viewport) => {
  const page = await browser.newPage(viewport ? { viewport } : undefined);
  const problems = [];
  page.on('console', message => {
    if (/^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  return { page, problems };
};
const requests = page => page.evaluate(() => window.__operationsRequests ?? []);
const waitForRequest = (page, pattern) =>
  page.waitForFunction(source => (window.__operationsRequests ?? []).some(entry => new RegExp(source).test(entry)), pattern.source, { timeout: 10_000 });

/**
 * `path` at 390 px with the CPU throttled 6x, waiting for `readySelector`: the page must not scroll sideways (reported
 * with the widest elements past the viewport).
 */
const checkPhoneWidth = async (label, path, readySelector) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(readySelector, { timeout: 30_000 });
  await page.waitForTimeout(600);
  const phone = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .map(element => ({ element, right: element.getBoundingClientRect().right }))
      .filter(({ right }) => right > viewport + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 3)
      .map(({ element, right }) => `${element.tagName.toLowerCase()}${element.getAttribute('data-slot') ? `[${element.getAttribute('data-slot')}]` : ''} ${Math.round(right)}`);
    return { pageScroll: document.documentElement.scrollWidth, viewport, wide };
  });
  report(`${label}: at 390 px (CPU 6x) the page does not scroll sideways`, phone.pageScroll <= phone.viewport, `${phone.pageScroll} / ${phone.viewport}: ${phone.wide.join(', ')}`);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.close();
};

const context = { baseUrl, browser, openPage, report, requests, waitForRequest, checkPhoneWidth };
for (const [name, run] of [
  ['issues', runIssues],
  ['database', runDatabase],
  ['crons', runCrons],
]) {
  try {
    await run(context);
  } catch (error) {
    report(`${name} browser run`, false, error instanceof Error ? error.message : String(error));
  }
}
await browser.close();
if (failed) process.exit(1);
