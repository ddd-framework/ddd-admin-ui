// The ./files manager in a headless browser against `next start` (app/files-sticky): under a host's fixed top bar
// (--nav-h) the folder bar sticks right below that bar while the page scrolls past a long folder, embedded (the window
// scrolls the list) and in the page frame (the bar never slides under the top bar). Measured with
// getBoundingClientRect at 1280×520, not read from a class.
// Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome").
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

const measure = async page =>
  page.evaluate(() => {
    const bar = document.querySelector('[data-file-folder-bar]');
    const topBar = document.querySelector('[data-host-top-bar]');
    return {
      barTop: bar ? bar.getBoundingClientRect().top : null,
      navBottom: topBar ? topBar.getBoundingClientRect().bottom : null,
      scrollY: window.scrollY,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    };
  });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 520 } });

  await page.goto(`${baseUrl}/files-sticky?variant=embedded`, { waitUntil: 'networkidle' });
  await page.getByText('Long list file 60.pdf').first().waitFor();
  const before = await measure(page);
  report('embedded: the page is long enough to scroll past the bar', before.maxScroll > 600, JSON.stringify(before));
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(150);
  const scrolled = await measure(page);
  report(
    'embedded: after scrolling the folder bar sits right below the top bar',
    scrolled.scrollY >= 590 && scrolled.barTop !== null && Math.abs(scrolled.barTop - scrolled.navBottom) <= 1,
    JSON.stringify(scrolled)
  );
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const bottom = await measure(page);
  report('embedded: still below the top bar at the end of the list', bottom.barTop !== null && Math.abs(bottom.barTop - bottom.navBottom) <= 1, JSON.stringify(bottom));

  await page.goto(`${baseUrl}/files-sticky`, { waitUntil: 'networkidle' });
  await page.getByText('Long list file 01.pdf').first().waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const frame = await measure(page);
  report('page frame: the folder bar is never under the top bar', frame.barTop !== null && frame.barTop >= frame.navBottom - 1, JSON.stringify(frame));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
