// The shell in a headless browser against `next start`: one navigation feeds the sidebar, the breadcrumbs and the
// document title; the active entry, the rights predicate, the collapse (button, `[`, stored and restored after
// hydration), the icon rail's flyout, the mobile menu, the folding breadcrumbs and RTL — without a hydration warning.
// Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome"); no download.
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

/** A page (in its own context, so storage starts empty) that records console errors, page errors and hydration warnings. */
const openPage = async (path, viewport = { width: 1280, height: 800 }, context) => {
  const ownContext = context ?? (await browser.newContext({ viewport }));
  const page = await ownContext.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (/^Failed to load resource/.test(message.text())) return;
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  return { page, problems, context: ownContext };
};
const settle = (page, ms = 200) => page.waitForTimeout(ms);
const sidebarNav = (page) => page.locator('aside[data-shell-sidebar] nav');
const crumbs = (page) => page.locator('[data-shell-breadcrumbs]');
const collapsedState = (page) => page.evaluate(() => document.querySelector('[data-shell]')?.hasAttribute('data-shell-collapsed') ?? null);

try {
  // desktop: active entry, rights predicate, breadcrumbs and title from the same navigation
  {
    const { page, problems, context } = await openPage('/shell/items/42/details');
    const nav = sidebarNav(page);
    report('the sidebar is a navigation landmark named Main', (await page.getByRole('navigation', { name: 'Main' }).count()) === 1 && (await nav.isVisible()));
    const current = nav.locator('[aria-current="page"]');
    report('exactly one current entry: Items', (await current.count()) === 1 && (await current.textContent())?.startsWith('Items'), await current.allTextContents().then(String));
    report('the group holding it is open', (await nav.getByRole('button', { name: 'Catalog' }).getAttribute('aria-expanded')) === 'true');
    report('the rights predicate hides the entry', (await nav.getByText('Secret area').count()) === 0);
    report('the badge and the lock reason are in the entries', (await nav.locator('[data-nav-key="items"]').textContent())?.includes('2') && (await nav.locator('[data-nav-key="reports"]').textContent())?.includes('Not in your plan'));
    const trail = crumbs(page);
    await page.waitForFunction(() => document.querySelector('[data-shell-breadcrumbs]')?.textContent?.includes('Item 42 name'), null, { timeout: 3_000 });
    report('breadcrumbs: group as text, entry as a link, entity name from the host hook, current page', (await trail.locator('[data-crumb="group"] a').count()) === 0 && (await trail.locator('[data-crumb="group"]').textContent()) === 'Catalog' && (await trail.locator('[data-crumb="leaf"] a').getAttribute('href')) === '/shell/items' && (await trail.locator('[data-crumb="entity"]').textContent()) === 'Item 42 name' && (await trail.locator('[aria-current="page"]').textContent()) === 'Details');
    await page.waitForFunction(() => document.title === 'Details · Item 42 name · Fixture', null, { timeout: 3_000 }).catch(() => {});
    report('document title from the same navigation, entity name included', (await page.title()) === 'Details · Item 42 name · Fixture', await page.title());

    // client navigation through the sidebar moves the current entry, the trail and the title
    await nav.getByRole('link', { name: 'People' }).click();
    await page.waitForURL('**/shell/people');
    await settle(page);
    report('after a sidebar link: People is current, the trail and title follow', (await nav.locator('[aria-current="page"]').textContent()) === 'People' && (await trail.locator('[aria-current="page"]').textContent()) === 'People' && (await page.title()) === 'People · Fixture', await page.title());

    // a page the predicate hides still has its crumb (as the current page)
    await page.goto(`${baseUrl}/shell/secret`, { waitUntil: 'networkidle' });
    report('a hidden entry keeps its crumb (resolved against the whole tree)', (await crumbs(page).locator('[aria-current="page"]').textContent()) === 'Secret area');

    // collapse: the foot row, stored, the content follows; restored after a reload without a hydration warning
    await page.goto(`${baseUrl}/shell/items`, { waitUntil: 'networkidle' });
    report('expanded first (nothing stored)', (await collapsedState(page)) === false);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await settle(page, 400);
    const margin = await page.evaluate(() => getComputedStyle(document.querySelector('[data-shell-content]')).marginInlineStart);
    report('the button collapses to the rail; the content reserves the rail width', (await collapsedState(page)) === true && margin === '80px', margin);
    report('the state is stored', (await page.evaluate(() => localStorage.getItem('fixture.sidebar.ltr'))) === '1');
    report('the rail names its entries (aria-label) and marks the current one', (await sidebarNav(page).locator('[aria-current="page"]').count()) === 0 && (await sidebarNav(page).getByRole('button', { name: 'Catalog' }).count()) === 1);
    // a group on the rail opens its flyout menu with the entries
    await sidebarNav(page).getByRole('button', { name: 'Catalog' }).click();
    const flyout = page.getByRole('menu');
    await flyout.waitFor({ timeout: 2_000 });
    report('a rail group opens a menu with its entries, the current one marked', (await flyout.getByRole('menuitem', { name: /Items/ }).getAttribute('aria-current')) === 'page');
    await page.keyboard.press('Escape');
    await settle(page);
    report('Escape closes the flyout and returns the focus to its icon', (await page.getByRole('menu').count()) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Catalog');
    problems.length = 0;
    await page.reload({ waitUntil: 'networkidle' });
    await settle(page);
    report('after a reload the stored rail applies after hydration, no hydration warning', (await collapsedState(page)) === true && problems.length === 0, problems.join(' | '));

    // the shortcut: `[` toggles from the page, never while typing
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press('[');
    await settle(page);
    report('[ expands the sidebar', (await collapsedState(page)) === false && (await page.evaluate(() => localStorage.getItem('fixture.sidebar.ltr'))) === '0');
    await page.focus('#page-input');
    await page.keyboard.press('[');
    await settle(page);
    report('[ in a text field types and does not toggle', (await collapsedState(page)) === false && (await page.inputValue('#page-input')) === '[');
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press('[');
    await settle(page);
    report('[ collapses again', (await collapsedState(page)) === true);

    // skip link
    await page.goto(`${baseUrl}/shell`, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    report('the first tab stop is "Skip to content"', (await page.evaluate(() => document.activeElement?.textContent)) === 'Skip to content');
    report('desktop: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await context.close();
  }

  // narrow desktop: the breadcrumbs fold into an ellipsis menu
  {
    const { page, problems, context } = await openPage('/shell/items/42/members', { width: 860, height: 700 });
    const trail = crumbs(page);
    const ellipsis = trail.getByRole('button', { name: 'Show full path' });
    report('narrow: the ellipsis shows, older crumbs fold, the parent stays', (await ellipsis.isVisible()) && !(await trail.locator('[data-crumb="group"]').isVisible()) && (await trail.locator('[data-crumb="entity"]').isVisible()));
    await ellipsis.click();
    const menu = page.getByRole('menu');
    await menu.waitFor({ timeout: 2_000 });
    const entries = await menu.getByRole('menuitem').allTextContents();
    report('the ellipsis menu lists the full path', entries.join(' / ').startsWith('Catalog / Items'), entries.join(' / '));
    await page.keyboard.press('Escape');
    report('narrow: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await context.close();
  }

  // phone: the sidebar is hidden, the menu button opens the navigation sheet, a link closes it
  {
    const { page, problems, context } = await openPage('/shell/items', { width: 390, height: 800 });
    report('phone: the sidebar column is hidden', !(await page.locator('aside[data-shell-sidebar]').isVisible()));
    const button = page.getByRole('button', { name: 'Open navigation' });
    await button.click();
    const sheet = page.getByRole('dialog', { name: 'Navigation' });
    await sheet.waitFor({ timeout: 2_000 });
    report('the menu button opens the navigation dialog with the Main landmark and the footer', (await page.locator('[data-shell-menu-button]').getAttribute('aria-expanded')) === 'true' && (await sheet.getByRole('navigation', { name: 'Main' }).count()) === 1 && (await sheet.locator('#menu-footer').count()) === 1);
    report('the current entry is marked in the menu', (await sheet.locator('[aria-current="page"]').textContent())?.startsWith('Items'));
    await sheet.getByRole('link', { name: 'People' }).click();
    await page.waitForURL('**/shell/people');
    await page.waitForFunction(() => !document.querySelector('[data-shell-mobile-menu]'), null, { timeout: 2_000 }).catch(() => {});
    report('a followed link navigates and closes the menu', (await page.getByRole('dialog').count()) === 0 && (await page.textContent('#page-path')) === '/people');
    report('[ does nothing on a phone (no sidebar)', await (async () => {
      await page.keyboard.press('[');
      await settle(page);
      return (await collapsedState(page)) === false;
    })());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    report('phone: no sideways page scroll', !overflow);
    report('phone: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await context.close();
  }

  // RTL: the sidebar sits on the right, the content reserves the right, the menu slides from the right
  {
    const { page, problems, context } = await openPage('/shell-rtl/items', { width: 1280, height: 800 });
    const box = await page.locator('aside[data-shell-sidebar]').boundingBox();
    const margins = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('[data-shell-content]'));
      return { right: style.marginRight, left: style.marginLeft };
    });
    report('RTL: the sidebar is at the right edge, the content reserves the right', box !== null && Math.round(box.x + box.width) === 1280 && margins.right === '256px' && margins.left === '0px', JSON.stringify({ box, margins }));
    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const sheet = page.getByRole('dialog', { name: 'Navigation' });
    await sheet.waitFor({ timeout: 2_000 });
    await settle(page, 600);
    const sheetBox = await sheet.boundingBox();
    report('RTL: the menu opens from the right edge', sheetBox !== null && Math.round(sheetBox.x + sheetBox.width) === 390, JSON.stringify(sheetBox));
    report('RTL: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await context.close();
  }
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  await browser.close();
}
if (failed) process.exit(1);
