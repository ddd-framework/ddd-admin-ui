// T2, T3, T7, the sized list table, SegmentedControl, Combobox and the showcase in a headless browser against `next start`.
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

    await page.getByRole('checkbox', { name: 'Select all loaded' }).click();
    const selectionState = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-entity-list-scroll] tbody [role="checkbox"]')];
      return {
        checked: rows.filter((box) => box.getAttribute('aria-checked') === 'true').length,
        disabled: rows.filter((box) => box.hasAttribute('disabled')).length,
        header: document.querySelector('[data-entity-list-scroll] thead [role="checkbox"]')?.getAttribute('aria-checked'),
      };
    });
    report(
      'list: isSelectable — disabled checkboxes, select all takes the selectable rows only',
      selectionState.checked === 24 && selectionState.disabled === 6 && selectionState.header === 'true',
      JSON.stringify(selectionState),
    );
    await page.getByRole('checkbox', { name: 'Select all loaded' }).click();

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

    const createdButton = page.getByRole('button', { name: 'Created' });
    const arrowFirst = await createdButton.evaluate((button) => button.firstElementChild?.tagName.toLowerCase() === 'svg');
    await createdButton.click();
    const createdFirst = await page.textContent('#sort');
    await createdButton.click();
    await createdButton.click();
    report(
      'list: end-aligned sortable header puts the arrow first; sortStart desc starts descending',
      arrowFirst && createdFirst === 'created:desc' && (await page.textContent('#sort')) === '',
      `${arrowFirst} ${createdFirst}`,
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

  // SegmentedControl (app/segmented): roles, keyboard in both activation modes, RTL, disabled reason, description,
  // icon-only name and tooltip, drag preview
  {
    const consoleProblems = [];
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
    await page.goto(`${baseUrl}/segmented`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#drag [data-slot="segmented-control-indicator"]'), null, { timeout: 10_000 });
    const probe = async (id) => page.$eval(`#${id}`, (element) => ({ value: element.dataset.value, changes: element.dataset.changes }));
    const focusedName = () => page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\d+$/, ''));

    // roles and tab stop
    const roles = await page.evaluate(() => {
      const group = document.querySelector('#automatic [role="radiogroup"]');
      const radios = [...group.querySelectorAll('[role="radio"]')];
      return {
        label: group.getAttribute('aria-label'),
        count: radios.length,
        checked: radios.filter((radio) => radio.getAttribute('aria-checked') === 'true').length,
        tabStops: radios.filter((radio) => radio.tabIndex === 0).length,
        tabStopIsChecked: radios.find((radio) => radio.tabIndex === 0)?.getAttribute('aria-checked') === 'true',
      };
    });
    report(
      'segmented: radiogroup with radios, exactly one checked, one tab stop on it',
      roles.label === 'Period' && roles.count === 4 && roles.checked === 1 && roles.tabStops === 1 && roles.tabStopIsChecked,
      JSON.stringify(roles),
    );

    // accessibility tree: names and descriptions as a screen reader gets them
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const radioNamed = (name) => nodes.find((node) => node.role?.value === 'radio' && node.name?.value === name);
    const week = radioNamed('Week');
    const month = radioNamed('Month');
    report('segmented: description announced after the label (aria-describedby)', week?.description?.value === 'Seven days', JSON.stringify(week?.description));
    report('segmented: the decorative badge is not part of the name', Boolean(week));
    report('segmented: disabled option announces its reason', month?.description?.value === 'Not enough data yet', JSON.stringify(month?.description));
    report(
      'segmented: disabled option is marked disabled',
      Boolean(month?.properties?.some((property) => property.name === 'disabled' && property.value.value === true)),
    );
    report('segmented: icon-only option keeps its label as name', Boolean(radioNamed('Grid view')) && Boolean(radioNamed('Table view')));

    // automatic: arrows / Home / End move and select, skipping the disabled option, wrapping
    await page.focus('#automatic [role="radio"][aria-checked="true"]');
    const automaticSteps = [];
    for (const key of ['ArrowRight', 'ArrowRight', 'Home', 'ArrowLeft', 'End', 'ArrowDown']) {
      await page.keyboard.press(key);
      automaticSteps.push(`${key}:${(await probe('automatic-probe')).value}`);
    }
    report(
      'segmented: automatic activation moves and selects, skips the disabled option, wraps',
      automaticSteps.join(' ') === 'ArrowRight:week ArrowRight:year Home:day ArrowLeft:year End:year ArrowDown:day',
      automaticSteps.join(' '),
    );
    report('segmented: automatic changes fire once per move', (await probe('automatic-probe')).changes === 'week,year,day,year,day');

    // manual: arrows move the focus only; Space / Enter select
    await page.focus('#manual [role="radio"][aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    const afterArrow = { focused: await focusedName(), ...(await probe('manual-probe')) };
    await page.keyboard.press('Space');
    const afterSpace = await probe('manual-probe');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    const afterEnter = await probe('manual-probe');
    report(
      'segmented: manual activation — arrows move focus only, Space / Enter select',
      afterArrow.focused === 'Week' && afterArrow.value === 'day' && afterArrow.changes === '' && afterSpace.value === 'week' && afterEnter.value === 'year' && afterEnter.changes === 'week,year',
      JSON.stringify({ afterArrow, afterSpace, afterEnter }),
    );

    // right to left: ArrowLeft goes forward
    await page.focus('#rtl [role="radio"][aria-checked="true"]');
    await page.keyboard.press('ArrowLeft');
    const rtlForward = (await probe('rtl-probe')).value;
    await page.keyboard.press('ArrowRight');
    report('segmented: right to left swaps the horizontal arrows', rtlForward === 'week' && (await probe('rtl-probe')).value === 'day', rtlForward);

    // a click on the disabled option changes nothing; hovering shows its reason
    await page.click('#automatic [role="radio"]:nth-of-type(3)', { force: true });
    report('segmented: a click on a disabled option changes nothing', (await probe('automatic-probe')).value === 'day');
    // Radix opens a tooltip on pointer movement over its trigger (and keeps a clicked trigger's tooltip closed until the
    // pointer leaves): leave, then move over the option in steps until the tooltip with the text shows
    const tooltipOf = async (selector, text) => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await page.mouse.move(0, 0);
        const box = await page.locator(selector).boundingBox();
        await page.mouse.move(box.x + box.width / 2 - 3, box.y + box.height / 2, { steps: 5 });
        await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2, { steps: 5 });
        const shown = await page
          .waitForFunction(
            (expected) => [...document.querySelectorAll('[data-slot="tooltip-content"]')].some((tip) => tip.textContent?.includes(expected)),
            text,
            { timeout: 2_000 },
          )
          .then(() => true, () => false);
        if (shown) return true;
      }
      return false;
    };
    report('segmented: disabled option shows its reason as tooltip', await tooltipOf('#automatic button[aria-disabled="true"]', 'Not enough data yet'));
    report('segmented: icon-only option shows its label as tooltip', await tooltipOf('#icons button[role="radio"]:not([aria-checked="true"])', 'Table view'));
    await page.mouse.move(0, 0);

    // drag: preview without changes, one change on release; Escape and pointer cancel restore
    const centre = async (index) =>
      page.$eval(`#drag [role="radio"]:nth-of-type(${index})`, (element) => {
        const box = element.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      });
    const indicatorOver = (index) =>
      page.evaluate((position) => {
        const indicator = document.querySelector('#drag [data-slot="segmented-control-indicator"]').getBoundingClientRect();
        const option = document.querySelectorAll('#drag [role="radio"]')[position - 1].getBoundingClientRect();
        return Math.abs(indicator.left + indicator.width / 2 - (option.left + option.width / 2)) < 2;
      }, index);
    const a = await centre(1);
    const b = await centre(2);
    const c = await centre(3);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.move(c.x, c.y, { steps: 4 });
    await page.waitForTimeout(350);
    const during = { ...(await probe('drag-probe')), previewOnC: await indicatorOver(3) };
    await page.mouse.up();
    const released = await probe('drag-probe');
    report(
      'segmented: drag previews without a change, then fires one change on release',
      during.changes === '' && during.value === 'a' && during.previewOnC && released.value === 'c' && released.changes === 'c',
      JSON.stringify({ during, released }),
    );

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(a.x, a.y, { steps: 4 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    const restoredOnC = await indicatorOver(3);
    await page.mouse.up();
    report('segmented: Escape during a drag restores and changes nothing', restoredOnC && (await probe('drag-probe')).changes === 'c');

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.evaluate(() =>
      document.querySelector('#drag [role="radiogroup"]').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true, isPrimary: true, pointerType: 'mouse' })),
    );
    await page.waitForTimeout(350);
    const cancelledOnC = await indicatorOver(3);
    await page.mouse.up();
    report('segmented: pointer cancel restores and changes nothing', cancelledOnC && (await probe('drag-probe')).changes === 'c');

    // a control wider than its 358 px container scrolls inside itself and keeps the selected / focused option in view
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.focus('#narrow [role="radio"][aria-checked="true"]');
    await page.keyboard.press('End');
    await page.waitForTimeout(300);
    const narrow = await page.evaluate(() => {
      const group = document.querySelector('#narrow [role="radiogroup"]');
      const frame = group.getBoundingClientRect();
      const selected = group.querySelector('[aria-checked="true"]').getBoundingClientRect();
      const focused = document.activeElement.getBoundingClientRect();
      const inside = (box) => box.left >= frame.left - 1 && box.right <= frame.right + 1;
      return {
        groupWidth: Math.round(frame.width),
        scrollWidth: group.scrollWidth,
        clientWidth: group.clientWidth,
        selectedInView: inside(selected),
        focusedInView: inside(focused),
        pageScroll: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      };
    });
    report(
      'segmented: at 358 px the control scrolls inside itself, the selected and focused option in view, no page scroll',
      narrow.groupWidth <= 358 && narrow.scrollWidth > narrow.clientWidth && narrow.selectedInView && narrow.focusedInView && narrow.pageScroll <= narrow.viewport,
      JSON.stringify(narrow),
    );
    report('segmented: no hydration warning or console error', consoleProblems.length === 0, consoleProblems.join(' | '));
    await page.close();
  }

  // Combobox (app/combobox): out-of-order server answers, picked label outside the results, reset on close, keyboard
  // through groups and the create row, clearing
  {
    const consoleProblems = [];
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
    await page.goto(`${baseUrl}/combobox`, { waitUntil: 'networkidle' });
    const trigger = (name) => page.getByRole('combobox', { name, exact: true });
    report('combobox: a picked value outside the results shows its label', (await trigger('Server search').textContent())?.includes('Picked outside the results') === true);

    // record every option text the list ever shows while typing
    await trigger('Server search').click();
    await page.waitForSelector('[cmdk-input]');
    await page.evaluate(() => {
      window.seenOptions = new Set();
      const record = () => document.querySelectorAll('[cmdk-item]').forEach((item) => window.seenOptions.add(item.textContent?.trim()));
      record();
      window.optionObserver = new MutationObserver(record);
      window.optionObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await page.keyboard.type('a');
    await page.waitForTimeout(450); // the debounce sends 'a' (answered after 900 ms)
    await page.keyboard.type('b');
    await page.waitForFunction(() => [...document.querySelectorAll('[cmdk-item]')].some((item) => item.textContent?.includes('for “ab”')), null, { timeout: 5_000 });
    await page.waitForTimeout(1_200); // the late answer to 'a' arrives and must be dropped
    const seen = await page.evaluate(() => [...window.seenOptions]);
    const shown = await page.evaluate(() => [...document.querySelectorAll('[cmdk-item]')].map((item) => item.textContent?.trim()));
    report(
      'combobox: out-of-order answers — the stale term never shows, the last term stays',
      !seen.some((text) => text?.includes('for “a”')) && shown.length === 2 && shown.every((text) => text?.includes('for “ab”')),
      JSON.stringify({ seen, shown }),
    );
    report('combobox: search is debounced (a and ab asked, not every keystroke twice)', JSON.stringify(await page.evaluate(() => window.comboboxSearches)) === '["a","ab"]', JSON.stringify(await page.evaluate(() => window.comboboxSearches)));

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const afterClose = await page.evaluate(() => window.comboboxSearches.at(-1));
    await trigger('Server search').click();
    const reopenedTerm = await page.inputValue('[cmdk-input]');
    report('combobox: closing calls onSearch with an empty term and clears the input', afterClose === '' && reopenedTerm === '', `${JSON.stringify(afterClose)} ${JSON.stringify(reopenedTerm)}`);
    await page.keyboard.press('Escape');

    // keyboard through groups
    await trigger('Grouped').click();
    await page.waitForSelector('[cmdk-input]');
    const highlighted = [];
    for (let step = 0; step < 4; step += 1) {
      highlighted.push(await page.evaluate(() => document.querySelector('[cmdk-item][data-selected="true"]')?.textContent?.trim()));
      await page.keyboard.press('ArrowDown');
    }
    const headings = await page.evaluate(() => [...document.querySelectorAll('[cmdk-group-heading]')].map((heading) => heading.textContent));
    report(
      'combobox: arrows walk the options across groups in order',
      highlighted.join('|') === 'North|South|Operations|Sales3' && headings.join('|') === 'Regions|Teams',
      `${highlighted.join('|')} / ${headings.join('|')}`,
    );
    // the create row: a term matching no label, reached with the arrows
    await page.keyboard.type('Nor');
    await page.waitForTimeout(100);
    const createAbsent = await page.evaluate(() => ![...document.querySelectorAll('[cmdk-item]')].some((item) => item.textContent?.startsWith('Create')));
    await page.keyboard.type('th'); // "North" equals a label (case-insensitive): no create row
    await page.waitForTimeout(100);
    const exactAbsent = await page.evaluate(() => ![...document.querySelectorAll('[cmdk-item]')].some((item) => item.textContent?.startsWith('Create')));
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('dic');
    await page.waitForTimeout(100);
    for (let step = 0; step < 3; step += 1) {
      if (await page.evaluate(() => document.querySelector('[cmdk-item][data-selected="true"]')?.textContent?.startsWith('Create'))) break;
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('[cmdk-input]').length === 0, null, { timeout: 2_000 }).catch(() => {});
    const createdState = await page.$eval('#grouped-value', (element) => element.dataset.created);
    const closed = (await page.$$('[cmdk-input]')).length === 0;
    report(
      'combobox: the create row appears when no label equals the term, is reached by keyboard, closes and passes the trimmed term',
      createAbsent === false && exactAbsent && createdState === 'Nordic' && closed,
      JSON.stringify({ createAbsent, exactAbsent, createdState, closed }),
    );

    // clearing: the clear control, and re-picking only with clearable
    await trigger('Grouped').click();
    await page.getByRole('option', { name: 'South' }).click();
    const picked = await page.$eval('#grouped-value', (element) => element.dataset.value);
    await page.getByRole('button', { name: 'Clear' }).click();
    const cleared = await page.$eval('#grouped-value', (element) => element.dataset.value);
    await trigger('Grouped').click();
    await page.getByRole('option', { name: 'South' }).click();
    await trigger('Grouped').click();
    await page.getByRole('option', { name: 'South' }).click();
    const repicked = await page.$eval('#grouped-value', (element) => element.dataset.value);
    await trigger('Not clearable').click();
    await page.getByRole('option', { name: 'North' }).click();
    const kept = await page.$eval('#kept-value', (element) => element.dataset.value);
    report(
      'combobox: clear control and re-pick clear with clearable; without it the value is kept',
      picked === 'south' && cleared === '' && repicked === '' && kept === 'north' && (await page.getByRole('button', { name: 'Clear' }).count()) === 0,
      JSON.stringify({ picked, cleared, repicked, kept }),
    );
    report('combobox: no hydration warning or console error', consoleProblems.length === 0, consoleProblems.join(' | '));
    await page.close();
  }

  // Showcase (app/showcase): renders light and dark, loads ./notify-sonner through the host's loader, host section last
  {
    const consoleProblems = [];
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));
    await page.goto(`${baseUrl}/showcase`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-showcase-theme="dark"] [data-showcase-loaded="notify-sonner"]', { timeout: 10_000 }).catch(() => {});
    const state = await page.evaluate(() => ({
      panes: [...document.querySelectorAll('[data-showcase-theme]')].map((pane) => pane.getAttribute('data-showcase-theme')).join(','),
      darkBackground: getComputedStyle(document.querySelector('[data-showcase-theme="dark"]')).backgroundColor,
      lightBackground: getComputedStyle(document.querySelector('[data-showcase-theme="light"]')).backgroundColor,
      loaded: document.querySelectorAll('[data-showcase-loaded="notify-sonner"]').length,
      host: document.querySelectorAll('#host-block').length,
      radios: document.querySelectorAll('[data-showcase] [role="radiogroup"]').length,
    }));
    report('showcase: a light and a dark pane in the host theme', state.panes === 'light,dark' && state.darkBackground !== state.lightBackground, JSON.stringify(state));
    report('showcase: ./notify-sonner loaded lazily through the host loader', state.loaded === 2);
    report('showcase: the host section renders in both panes', state.host === 2);
    const frames = await page.evaluate(() => document.querySelectorAll('[data-showcase] [data-page-frame]').length);
    report('showcase: page specimens emit no data-page-frame', frames === 0, String(frames));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const phone = await page.evaluate(() => ({ pageScroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    report('showcase: at 390 px the page does not scroll sideways', phone.pageScroll <= phone.viewport, JSON.stringify(phone));
    report('showcase: no hydration warning or console error', consoleProblems.length === 0, consoleProblems.join(' | '));
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
