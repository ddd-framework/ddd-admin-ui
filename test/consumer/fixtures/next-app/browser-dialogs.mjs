// FormDialog, the ⌘S / Ctrl+S rule of FormActions, the header slot and useConfirm in a headless browser against
// `next start`. Browser: CHROME_PATH, else the installed Google Chrome (playwright channel "chrome"); no download.
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
const SAVE = 'Control+s';

/** A page that records console errors, page errors and hydration warnings. */
const openPage = async (path, viewport) => {
  const page = await browser.newPage(viewport ? { viewport } : undefined);
  const problems = [];
  page.on('console', (message) => {
    if (/^Failed to load resource/.test(message.text())) return; // a missing favicon
    if (message.type() === 'error' || (message.type() === 'warning' && /hydrat/i.test(message.text()))) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  return { page, problems };
};
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
const settle = (page) => page.waitForTimeout(150);
/** Visible, and its layer registered (Radix registers dismissable layers in an effect after the first paint). */
const opened = async (locator) => {
  await locator.waitFor();
  await locator.page().waitForTimeout(150);
};

try {
  // FormDialog
  {
    const { page, problems } = await openPage('/form-dialog');
    const text = (selector) => page.textContent(selector);
    await page.click('#open-dialog');
    const dialog = page.getByRole('dialog', { name: 'Rename' });
    await opened(dialog);
    report('FormDialog renders a real <form> holding header, fields and buttons', await dialog.evaluate((element) => {
      const form = element.querySelector('form');
      return form !== null && form.contains(element.querySelector('#dialog-name')) && form.querySelector('button[type="submit"]') !== null;
    }));

    // Enter in a text field submits the dialog's form only; pending while the save runs
    await page.fill('#dialog-name', 'Renamed');
    await page.press('#dialog-name', 'Enter');
    const submit = dialog.getByRole('button', { name: 'Saving dialog…' });
    await submit.waitFor({ timeout: 2_000 });
    report('pending: the submit button is disabled and relabelled', await submit.isDisabled());
    report('pending: Cancel is disabled', await dialog.getByRole('button', { name: 'Cancel' }).isDisabled());
    await page.keyboard.press('Escape');
    await settle(page);
    report('pending: Escape is ignored', (await text('#dialog-open')) === 'open' && (await dialog.isVisible()));
    await page.mouse.click(5, 5);
    await settle(page);
    report('pending: a backdrop click is ignored', (await text('#dialog-open')) === 'open');
    await page.waitForFunction(() => document.querySelector('#dialog-open')?.textContent === 'closed', null, { timeout: 3_000 });
    report('Enter in a text field submitted the dialog form (and only that one)', (await text('#dialog-submits')) === 'Renamed' && (await text('#page-submits')) === '0', `${await text('#dialog-submits')} / page ${await text('#page-submits')}`);

    // a failed submit leaves the dialog open and usable
    await page.click('#open-dialog');
    await opened(dialog);
    await page.check('#fail-next');
    await dialog.getByRole('button', { name: 'Save dialog' }).click();
    await page.waitForSelector('#dialog-error', { timeout: 3_000 });
    const saveAgain = dialog.getByRole('button', { name: 'Save dialog' });
    report('failed submit: the dialog stays open with the error', (await text('#dialog-open')) === 'open' && (await text('#dialog-error')) === 'Could not save');
    report('failed submit: submit and Cancel are usable again', (await saveAgain.isEnabled()) && (await dialog.getByRole('button', { name: 'Cancel' }).isEnabled()));

    // ⌘S inside the dialog submits the dialog, never the page form behind it
    await page.fill('#dialog-name', 'Second');
    await page.focus('#dialog-name');
    await page.keyboard.press(SAVE);
    await page.waitForFunction(() => document.querySelector('#dialog-open')?.textContent === 'closed', null, { timeout: 3_000 });
    report('⌘S in the dialog submits the dialog form, not the page form', (await text('#dialog-submits')) === 'Renamed,Second' && (await text('#page-submits')) === '0');

    // a dialog opened from the dialog: Enter submits the nested form only; Escape closes only the nested dialog
    await page.click('#open-dialog');
    await opened(dialog);
    await page.click('#open-nested');
    const nested = page.getByRole('dialog', { name: 'Nested' });
    await opened(nested);
    await page.fill('#nested-name', 'Inner');
    await page.press('#nested-name', 'Enter');
    await nested.waitFor({ state: 'hidden', timeout: 3_000 });
    await settle(page);
    report(
      'nested dialog: Enter submits the nested form only (its submit does not reach the outer form)',
      (await text('#nested-submits')) === 'Inner' && (await text('#dialog-submits')) === 'Renamed,Second' && (await text('#dialog-open')) === 'open',
      `${await text('#nested-submits')} / ${await text('#dialog-submits')} / ${await text('#dialog-open')}`,
    );
    await page.click('#open-nested');
    await opened(nested);
    await page.keyboard.press('Escape');
    await nested.waitFor({ state: 'hidden', timeout: 3_000 });
    report('nested dialog: Escape closes only the nested dialog', (await text('#dialog-open')) === 'open' && (await dialog.isVisible()));
    await settle(page);
    const afterNested = await page.evaluate(() => document.activeElement?.id ?? '');
    report('nested dialog: the focus returns to the button that opened it', afterNested === 'open-nested', afterNested);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#dialog-open')?.textContent === 'closed', null, { timeout: 3_000 });
    report('Escape closes the dialog when not pending', true);
    await page.getByRole('dialog', { name: 'Rename' }).waitFor({ state: 'detached' });
    await settle(page);
    const afterClose = await page.evaluate(() => document.activeElement?.id ?? '');
    report('FormDialog: the focus returns to the button that opened it', afterClose === 'open-dialog', afterClose);

    // the page form still answers Enter on its own
    await page.press('#page-name', 'Enter');
    await page.waitForFunction(() => document.querySelector('#page-submits')?.textContent === '1', null, { timeout: 3_000 });
    report('two forms on a page: Enter in the page form submits the page form', (await text('#dialog-submits')) === 'Renamed,Second');
    report('FormDialog: no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // ⌘S / Ctrl+S
  {
    const { page, problems } = await openPage('/shortcut');
    const counts = async () => JSON.parse(await page.textContent('#counts'));
    const prevented = () => page.textContent('#prevented');

    await blur(page);
    await page.keyboard.press(SAVE);
    await settle(page);
    let state = await counts();
    report('focus on body: the first form answers, the second does not (one answer)', state.a === 1 && state.g === 0 && state.c === 0, JSON.stringify(state));
    report('focus on body: the default is prevented', (await prevented()) === 'true');

    await page.focus('#g-input');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('focus in a form: that form answers', state.a === 1 && state.g === 1, JSON.stringify(state));

    await page.focus('#b-input');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('focus in another form on the page: no FormActions form is submitted', state.a === 1 && state.g === 1 && state.b === 0, JSON.stringify(state));
    report('focus in another form: the default is left alone', (await prevented()) === 'false');

    await page.focus('#c-input');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('disabled primary: prevented, not submitted', state.c === 0 && (await prevented()) === 'true', JSON.stringify(state));

    // a drawer: the footer is portalled out of the form
    await page.click('#open-drawer');
    await opened(page.getByRole('dialog', { name: 'Drawer' }));
    report('drawer: the actions sit in the pinned footer outside the form', await page.evaluate(() => {
      const cancel = document.querySelector('#d-cancel');
      return cancel !== null && cancel.closest('form') === null && document.querySelector('#d-form') !== null;
    }));
    await page.focus('#d-cancel');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('drawer: focus on a footer button outside the form submits the drawer form', state.d === 1 && state.a === 1 && state.g === 1, JSON.stringify(state));
    await page.focus('#d-input');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('drawer: focus in the field submits it too', state.d === 2, JSON.stringify(state));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Drawer' }).waitFor({ state: 'hidden' });

    // two nested dialogs
    await page.click('#open-dialog');
    await opened(page.getByRole('dialog', { name: 'Dialog e' }));
    report('in a dialog the actions are a plain row (no sticky pill)', await page.evaluate(() => {
      const form = document.querySelector('#e-form');
      return form !== null && form.querySelector('[data-form-actions]') === null && form.querySelector('button[type="submit"]') !== null;
    }));
    await page.click('#open-inner');
    await opened(page.getByRole('dialog', { name: 'Dialog f' }));
    await page.focus('#f-input');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('nested dialogs: the inner dialog answers, the outer does not', state.f === 1 && state.e === 0, JSON.stringify(state));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Dialog f' }).waitFor({ state: 'hidden' });
    await page.focus('#open-inner');
    await page.keyboard.press(SAVE);
    await settle(page);
    state = await counts();
    report('nested dialogs: anywhere in the outer dialog (a button outside its form) submits the outer form', state.e === 1 && state.f === 1 && state.a === 1, JSON.stringify(state));
    report('shortcut: no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // header slot
  {
    const { page, problems } = await openPage('/slot', { width: 1280, height: 800 });
    await page.waitForFunction(() => document.querySelector('[data-form-actions-slot] button'), null, { timeout: 10_000 });
    const layout = await page.evaluate(() => {
      const slotOf = (name) => document.evaluate(`//button[normalize-space()="${name}"]`, document, null, 9, null).singleNodeValue?.closest('[data-form-actions-slot]') ?? null;
      const headerOf = (element) => element?.closest('header') ?? null;
      const button = (name) => document.evaluate(`//button[normalize-space()="${name}"]`, document, null, 9, null).singleNodeValue;
      return {
        outerInHeader: headerOf(slotOf('Save outer'))?.textContent?.includes('Outer') ?? false,
        innerInHeader: headerOf(slotOf('Save inner'))?.textContent?.includes('Inner') ?? false,
        rowInForm: button('Save row')?.closest('form')?.id ?? null,
        firstSlot: slotOf('Save first')?.closest('header')?.className.includes('first-header') ?? false,
        secondSlot: slotOf('Save second')?.closest('header')?.className.includes('second-header') ?? false,
        linked: button('Save outer')?.getAttribute('form') === 'outer-form' && button('Save outer')?.closest('form') === null,
      };
    });
    report('slot: the page form\'s actions sit in the shell header', layout.outerInHeader);
    report('slot: a nested shell takes the actions of its own form', layout.innerInHeader);
    report('slot: placement row stays in its form', layout.rowInForm === 'row-form', String(layout.rowInForm));
    report('slot: of two slots in one provider the closest above the form wins', layout.firstSlot && layout.secondSlot, JSON.stringify(layout));
    report('slot: the portalled submit button is linked back by the form attribute', layout.linked);

    await page.getByRole('button', { name: 'Save outer' }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('#counts').textContent).outer === 1, null, { timeout: 3_000 });
    report('slot: the portalled button submits its form', true);

    await page.focus('#outer-input');
    await page.keyboard.press(SAVE);
    await page.waitForFunction(() => JSON.parse(document.querySelector('#counts').textContent).outer === 2, null, { timeout: 3_000 });
    report('slot: ⌘S in the form submits it', true);

    const floating = () =>
      page.evaluate(() => {
        const pill = document.evaluate('//button[normalize-space()="Save outer"]', document, null, 9, null).singleNodeValue?.closest('[data-form-actions-placement="header"] > div');
        const navHeight = document.querySelector('#top-bar').getBoundingClientRect().height;
        return { floating: pill?.hasAttribute('data-form-actions-floating') ?? false, top: pill?.getBoundingClientRect().top ?? -1, navHeight };
      });
    report('slot: in the header the pill does not float', !(await floating()).floating);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);
    const scrolled = await floating();
    report(
      'slot: once the header scrolls away the pill floats under the top bar',
      scrolled.floating && Math.abs(scrolled.top - (scrolled.navHeight + 8)) <= 2,
      JSON.stringify(scrolled),
    );
    await page.focus('#outer-input').catch(() => {});
    await page.getByRole('button', { name: 'Save outer' }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('#counts').textContent).outer === 3, null, { timeout: 3_000 });
    report('slot: the floating pill still submits', true);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    report('slot: below the form the pill no longer floats', !(await floating()).floating);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    report('slot: back at the top the pill sits in the header again', !(await floating()).floating);
    report('slot: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // useConfirm
  {
    const { page, problems } = await openPage('/confirm');
    const answers = async () => JSON.parse(await page.textContent('#answers'));
    const activeId = () => page.evaluate(() => document.activeElement?.id ?? '');
    const confirmDialog = (name) => page.getByRole('dialog', { name });

    await page.click('#confirm-basic');
    await opened(confirmDialog('Archive?'));
    await page.keyboard.press('Escape');
    await confirmDialog('Archive?').waitFor({ state: 'hidden' });
    await settle(page);
    report('Escape answers false', (await answers()).basic === 'false', JSON.stringify(await answers()));
    report('the focus returns to the trigger', (await activeId()) === 'confirm-basic', await activeId());

    await page.click('#confirm-basic');
    await confirmDialog('Archive?').getByRole('button', { name: 'Confirm' }).click();
    await settle(page);
    report('Confirm answers true', (await answers()).basic === 'true');

    await page.click('#confirm-queue');
    await opened(confirmDialog('First?'));
    await confirmDialog('First?').getByRole('button', { name: 'Confirm' }).click();
    await opened(confirmDialog('Second?'));
    const focusInSecond = await page.evaluate(() => document.activeElement?.textContent ?? '');
    report('queued calls: the second shows after the first, the focus on its Cancel', focusInSecond === 'Cancel', focusInSecond);
    await page.keyboard.press('Enter');
    await confirmDialog('Second?').waitFor({ state: 'hidden' });
    await settle(page);
    report('queued calls settle in order, once each', (await answers()).queue === 'true,false', String((await answers()).queue));
    report('queued calls: the focus returns to the trigger', (await activeId()) === 'confirm-queue', await activeId());

    await page.click('#confirm-phrase');
    const phraseDialog = confirmDialog('Delete Main site?');
    await opened(phraseDialog);
    const deleteButton = phraseDialog.getByRole('button', { name: 'Delete' });
    report('requirePhrase: the confirm button starts off', await deleteButton.isDisabled());
    const phraseField = phraseDialog.getByLabel('Type “Main site” to confirm');
    report('requirePhrase: the phrase field has the focus', await phraseField.evaluate((element) => element === document.activeElement));
    await phraseField.fill('Main sit');
    report('requirePhrase: a partial phrase keeps it off', await deleteButton.isDisabled());
    await phraseField.fill('Main site');
    report('requirePhrase: the phrase turns it on', await deleteButton.isEnabled());
    await deleteButton.click();
    await settle(page);
    report('requirePhrase: confirm answers true', (await answers()).phrase === 'true');

    await page.click('#open-drawer');
    const drawer = page.getByRole('dialog', { name: 'Drawer' });
    await opened(drawer);
    await page.click('#drawer-confirm');
    await opened(confirmDialog('From the drawer?'));
    await page.keyboard.press('Escape');
    await confirmDialog('From the drawer?').waitFor({ state: 'hidden' });
    await settle(page);
    report('inside a drawer: Escape answers false and closes only the confirmation', (await answers()).drawer === 'false' && (await drawer.isVisible()));
    report('inside a drawer: the focus returns to the trigger in the drawer', (await activeId()) === 'drawer-confirm', await activeId());
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });

    await page.click('#inner-confirm');
    await settle(page);
    report(
      'two providers: the nearest one answers (its host confirm), no package dialog',
      (await answers()).inner === 'true' && (await page.textContent('#host-calls')) === 'Inner provider?' && (await page.getByRole('dialog').count()) === 0,
    );

    await page.click('#strict-confirm');
    await confirmDialog('In Strict Mode?').getByRole('button', { name: 'Confirm' }).click();
    await settle(page);
    report('Strict Mode: one answer, settled once', (await answers()).strict === 'true' && (await page.textContent('#settles')) === '1');

    await page.click('#unmount-confirm');
    await opened(confirmDialog('Unmounted while asking?'));
    await page.waitForFunction(() => JSON.parse(document.querySelector('#answers').textContent).unmount !== undefined, null, { timeout: 3_000 });
    report('an unmounted provider settles its pending call with false', (await answers()).unmount === 'false');
    report('useConfirm: no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  await browser.close();
}
if (failed) process.exit(1);
