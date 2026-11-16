// T2, T3, T7 and the sized list table in a headless browser against `next start`.
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

  // List table with column tracks, pins, sort and row index (app/list, minimum width 1628 px): hydration, tracks,
  // the pin guard at three widths, the sideways scroll inside the card at phone width, the sort cycle
  {
    const tableState = (page) =>
      page.evaluate(() => {
        const scroller = document.querySelector('[data-entity-list-scroll]');
        const table = scroller.querySelector('table');
        const headers = [...table.querySelectorAll('thead tr:first-child > th')];
        const box = (element) => element.getBoundingClientRect();
        const headerNamed = (name) => headers.find((cell) => cell.textContent.trim() === name);
        return {
          tracks: table.hasAttribute('data-list-tracks'),
          visible: scroller.clientWidth,
          scroll: scroller.scrollWidth,
          pageScroll: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
          name: box(headerNamed('Name')).width,
          city: box(headerNamed('City')).width,
          email: box(headerNamed('Email')).width,
          idPin: headerNamed('ID').getAttribute('data-list-pin'),
          actionsPin: headerNamed('Actions').getAttribute('data-list-pin'),
          firstIndex: table.querySelector('tbody tr td:nth-child(2)')?.textContent,
        };
      });
    const consoleProblems = [];
    const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
    page.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
    await page.goto(`${baseUrl}/list`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-entity-list-scroll] th[data-list-pin="end"]'), null, { timeout: 10_000 });

    const wide = await tableState(page);
    report('list: a column width gives the table tracks', wide.tracks);
    report('list: wide, the tracks fill the visible width (no sideways scroll)', wide.scroll === wide.visible, `${wide.scroll} / ${wide.visible}`);
    report('list: a 2fr track is twice a 1fr track', Math.abs(wide.name - 2 * wide.city) <= 2, `${wide.name} / ${wide.city}`);
    report('list: a share track never goes below its minimum', wide.email >= 220 - 0.5, String(wide.email));
    report('list: wide, the start pin is declined (no overflow)', wide.idPin === null, String(wide.idPin));
    report('list: the end pin always holds', wide.actionsPin === 'end');
    report('list: the row index counts from 1', wide.firstIndex === '1', String(wide.firstIndex));

    const nameHeader = page.locator('thead th', { has: page.getByRole('button', { name: 'Name' }) });
    const sortCycle = [];
    for (let click = 0; click < 3; click += 1) {
      await page.getByRole('button', { name: 'Name' }).click();
      sortCycle.push(`${(await nameHeader.getAttribute('aria-sort')) ?? '-'}|${await page.textContent('#sort')}`);
    }
    report(
      'list: sort cycle asc → desc → none, aria-sort on the header',
      sortCycle.join(' ') === 'ascending|name:asc descending|name:desc -|',
      sortCycle.join(' '),
    );

    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForFunction(() => document.querySelector('[data-entity-list-scroll] th[data-list-pin="start"]:nth-child(3)'), null, { timeout: 5_000 }).catch(() => {});
    const medium = await tableState(page);
    report('list: medium width overflows inside the card', medium.scroll > medium.visible, `${medium.scroll} / ${medium.visible}`);
    report('list: medium width honours the start pin (overflow, pinned total under a third)', medium.idPin === 'start', String(medium.idPin));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !document.querySelector('[data-entity-list-scroll] th[data-list-pin="start"]:nth-child(3)'), null, { timeout: 5_000 }).catch(() => {});
    const phone = await tableState(page);
    report('list: 390 px, the page does not scroll sideways', phone.pageScroll <= phone.viewport, `${phone.pageScroll} / ${phone.viewport}`);
    report('list: 390 px, the table scrolls inside its card', phone.scroll > phone.visible, `${phone.scroll} / ${phone.visible}`);
    report('list: 390 px, the start pin is declined (pinned total over a third)', phone.idPin === null, String(phone.idPin));
    const edges = await page.evaluate(async () => {
      const scroller = document.querySelector('[data-entity-list-scroll]');
      scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const frame = scroller.getBoundingClientRect();
      const row = scroller.querySelector('tbody tr');
      const cells = row.querySelectorAll('td');
      const actions = cells[cells.length - 1].getBoundingClientRect();
      const select = cells[0].getBoundingClientRect();
      return {
        actionsRight: Math.round(frame.left + scroller.clientWidth - actions.right),
        selectLeft: Math.round(select.left - frame.left),
        overflowStart: scroller.hasAttribute('data-list-overflow-start'),
        overflowEnd: scroller.hasAttribute('data-list-overflow-end'),
      };
    });
    report('list: scrolled, the end-pinned cell stays at the right edge', Math.abs(edges.actionsRight) <= 1, String(edges.actionsRight));
    report('list: scrolled, the selection cell stays at the left edge', Math.abs(edges.selectLeft) <= 1, String(edges.selectLeft));
    report('list: scrolled, content is marked under both pinned edges', edges.overflowStart && edges.overflowEnd);
    report('list: no hydration warning or console error', consoleProblems.length === 0, consoleProblems.join(' | '));
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
