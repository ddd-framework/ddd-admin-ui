// The blocks of 0.2.0 in a headless browser against `next start` (app/blocks): date presets, bulk menus with a
// confirmation, a content-sized pinned actions column, the segmented control's option height, translatable limits,
// the colour field, the route error, the side-by-side drawer, and ./markdown (server skeleton, editor after hydration,
// sanitised preview, absent from a page that does not import it).
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
  // the server HTML: a skeleton where the markdown editor goes, no editor markup
  const serverHtml = await (await fetch(`${baseUrl}/blocks`)).text();
  report('markdown: the server renders no editor (it loads after hydration)', !serverHtml.includes('w-md-editor'));

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const consoleProblems = [];
  page.on('console', message => {
    if (message.type() === 'error' && /^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => consoleProblems.push(`pageerror: ${error.message}`));
  // a failed request is named by its URL (the console line has none); the browser's favicon request is not ours
  page.on('response', response => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith('/favicon.ico')) consoleProblems.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${baseUrl}/blocks`, { waitUntil: 'networkidle' });

  // date presets
  await page.getByRole('radio', { name: 'Last 7 days' }).click();
  const last7 = await page.$eval('#dates-probe', element => ({ from: element.dataset.from, to: element.dataset.to }));
  report('date presets: last 7 days writes the typed-date values', last7.from === '2026-11-11' && last7.to === '2026-11-17', JSON.stringify(last7));
  const rangeShown = await page.locator('#dates').innerText();
  report('date presets: the resolved range shows next to the label', /2026/.test(rangeShown) || /Nov/.test(rangeShown), rangeShown);
  await page.getByRole('radio', { name: 'Custom' }).click();
  const dateInputs = await page.locator('#dates input[type="date"]').count();
  report('date presets: custom reveals the two date fields', dateInputs === 2, String(dateInputs));
  await page.getByRole('radio', { name: 'All time' }).click();
  const cleared = await page.$eval('#dates-probe', element => `${element.dataset.from}|${element.dataset.to}`);
  report('date presets: all time clears both bounds', cleared === '|', cleared);

  // bulk bar: note, menu, confirmation with the count, hint
  await page.click('#select-all');
  report('bulk bar: notes that more rows are on the server', await page.getByText('Only the loaded rows are selected').isVisible());
  await page.getByRole('button', { name: 'Move (4)' }).click();
  await page.getByRole('menuitem', { name: 'Later' }).click();
  const confirmTitle = await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByText('Move 4 rows?').isVisible();
  report('bulk bar: the choice asks first, with the count filled in', confirmTitle);
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#bulk-probe')?.dataset.moved === 'later');
  report('bulk bar: the confirmed choice reaches onChoose', true);
  await page.locator('#bulk span:has(> button[disabled])').hover();
  report('bulk bar: a disabled action shows its hint', await page.getByRole('tooltip').getByText('Filter first').first().isVisible().catch(() => false));
  await page.mouse.move(0, 0);

  // content-sized pinned actions column
  const table = await page.evaluate(() => {
    const scroller = document.querySelector('#table [data-entity-list-scroll]');
    const header = [...document.querySelectorAll('#table thead th')].at(-1);
    const actions = document.querySelector('#table [data-actions="1"]');
    const cell = actions?.closest('td');
    const style = cell ? getComputedStyle(cell) : null;
    const contentWidth = actions ? actions.getBoundingClientRect().width + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight) : 0;
    return {
      overflows: scroller.scrollWidth > scroller.clientWidth,
      pin: header?.dataset.listPin,
      cellWidth: cell?.getBoundingClientRect().width ?? 0,
      contentWidth,
      rightGap: scroller.getBoundingClientRect().right - (cell?.getBoundingClientRect().right ?? 0),
    };
  });
  report(
    'table: the actions column is as wide as its buttons and pinned to the end while the table scrolls',
    table.overflows && table.pin === 'end' && Math.abs(table.cellWidth - table.contentWidth) < 2 && Math.abs(table.rightGap) < 2,
    JSON.stringify(table),
  );

  // segmented control: option height, track from padding, indicator on the option box, plain badge, untranslated label
  const segmented = await page.evaluate(() => {
    const group = document.querySelector('#segmented [role="radiogroup"]');
    const option = group.querySelector('[role="radio"]');
    const indicator = group.querySelector('[data-slot="segmented-control-indicator"]');
    const badge = group.querySelector('[data-plain-badge]');
    return {
      label: group.getAttribute('aria-label'),
      track: group.getBoundingClientRect().height,
      option: option.getBoundingClientRect().height,
      indicatorTop: indicator.getBoundingClientRect().top - group.getBoundingClientRect().top,
      indicatorHeight: indicator.getBoundingClientRect().height,
      badgeWrapper: badge.parentElement.className,
    };
  });
  report(
    'segmented: option height 40, track 48 with p-1, indicator on the option box, unstyled badge',
    segmented.label === 'Bereich' && segmented.option === 40 && segmented.track === 48 && segmented.indicatorTop === 4 && segmented.indicatorHeight === 40 && !segmented.badgeWrapper.includes('rounded-full'),
    JSON.stringify(segmented),
  );

  // translatable limits: marked tab, counter, nothing cut, focus helper
  const limits = await page.evaluate(() => ({
    over: [...document.querySelectorAll('#limits [role="tab"][data-over-limit]')].map(tab => tab.textContent),
    counter: document.querySelector('#limits')?.innerText.includes('5 / 10'),
  }));
  report('limits: the over-limit language tab is marked, the counter counts the active text', limits.over.length === 1 && limits.over[0].startsWith('DE') && limits.counter, JSON.stringify(limits));
  await page.click('#focus-over');
  await page.waitForTimeout(100);
  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    value: document.activeElement?.value,
    invalid: document.activeElement?.getAttribute('aria-invalid'),
  }));
  report(
    'limits: the helper opens the first over-limit language and focuses its field; the text is kept',
    focused.tag === 'INPUT' && focused.value === 'Viel zu lang für das Feld' && focused.invalid === 'true',
    JSON.stringify(focused),
  );

  // colour field
  const colorInput = page.locator('#color input[aria-label="Accent"]');
  await colorInput.fill('ABC');
  await colorInput.press('Tab');
  report('colour: typed short hex is stored normalised', (await page.$eval('#color-probe', element => element.dataset.value)) === '#aabbcc');
  await colorInput.fill('not a colour');
  await colorInput.press('Tab');
  report(
    'colour: other text is refused and never passed on',
    (await page.$eval('#color-probe', element => element.dataset.value)) === '#aabbcc' && (await page.locator('#color [role="alert"]').isVisible()),
  );

  // markdown: editor after hydration, sanitised preview
  await page.waitForSelector('#markdown .w-md-editor', { timeout: 15_000 });
  report('markdown: the editor appears after hydration', true);
  const preview = await page.evaluate(() => ({
    xss: window.__xss,
    img: Boolean(document.querySelector('#preview img')),
    onerror: document.querySelector('#preview img')?.hasAttribute('onerror'),
    script: Boolean(document.querySelector('#preview script')),
  }));
  report('markdown: the preview is sanitised (no script, no handler; the image stays)', preview.xss === undefined && preview.img && !preview.onerror && !preview.script, JSON.stringify(preview));

  // route error
  await page.locator('#route-error').getByRole('button', { name: 'Try again' }).click();
  report('route error: an alert with a working retry', (await page.$eval('#retry-probe', element => element.dataset.retries)) === '1' && (await page.locator('#route-error [role="alert"]').count()) === 1);

  // side-by-side drawer
  await page.click('#open-drawer');
  await page.getByRole('dialog', { name: 'Beside the page' }).waitFor();
  const overlays = await page.locator('[data-slot="sheet-overlay"]').count();
  await page.click('#page-button');
  const afterClick = await page.$eval('#drawer-probe', element => ({ clicks: element.dataset.clicks, open: element.dataset.open }));
  report(
    'drawer modal={false}: no overlay, the page stays clickable, an outside click keeps it open',
    overlays === 0 && afterClick.clicks === '1' && afterClick.open === '1' && (await page.getByRole('dialog', { name: 'Beside the page' }).isVisible()),
    JSON.stringify({ overlays, afterClick }),
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#drawer-probe')?.dataset.open === '0');
  report('drawer modal={false}: Escape closes it', true);

  report('blocks page: no console error, no hydration warning', consoleProblems.length === 0, consoleProblems.join(' | '));
  await page.close();

  // ./markdown is absent from a page that does not import it
  const other = await browser.newPage();
  const scripts = [];
  other.on('response', response => {
    if (response.url().endsWith('.js')) scripts.push(response.text().catch(() => ''));
  });
  await other.goto(`${baseUrl}/segmented`, { waitUntil: 'networkidle' });
  const bodies = await Promise.all(scripts);
  report('markdown: a page without ./markdown loads none of the editor', bodies.length > 0 && !bodies.some(body => body.includes('w-md-editor')), `${bodies.length} scripts`);
  await other.close();
} catch (error) {
  report('blocks browser checks ran through', false, error instanceof Error ? error.stack : String(error));
} finally {
  await browser.close();
}
if (failed) process.exit(1);
