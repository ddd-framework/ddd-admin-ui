// The ./crons screen on the real RTK Query (app/operations/crons): the list on the trait's path, a Run now answered
// with 409 shows the server's message and keeps Run now off, a Run now that queues, the create form with the schedule
// preview and a 400 placed on its field, an edit that sends only the changed field, a delete behind the typed name,
// the result filter of the runs, 390 px with a throttled CPU, no console error or hydration warning.
const PREFIX = '/api/admin/common/crons';

export const run = async ({ openPage, report, requests, waitForRequest, checkPhoneWidth }) => {
  const { page, problems } = await openPage('/operations/crons');
  const table = page.locator('[data-slot="crons-table"]');
  const rowOf = name => table.locator('tr', { has: page.getByText(name, { exact: true }) });
  await rowOf('send-reminders').waitFor({ timeout: 15_000 });
  report('crons: the list is requested on the trait path', (await requests(page)).includes(`GET ${PREFIX}/list`));
  report('crons: six rows with status badges', (await table.locator('tbody tr').count()) === 6 && (await rowOf('export-legacy-report').getByText('Command missing').count()) === 1);
  report('crons: no Run now for a Cron whose command is missing', (await page.getByRole('button', { name: 'Run export-legacy-report now' }).count()) === 0);

  // Run now answered with 409: the message is shown, Run now stays off
  await page.getByRole('button', { name: 'Run cleanup-sessions now' }).click();
  await waitForRequest(page, new RegExp(`POST ${PREFIX}/4/run-now`));
  const actionError = page.locator('[data-slot="cron-action-error"]');
  await actionError.waitFor({ timeout: 10_000 });
  report('crons: a 409 of Run now shows the server message', /started meanwhile/.test((await actionError.textContent()) ?? ''));
  report('crons: after a 409 Run now is off for a minute', await page.getByRole('button', { name: 'Run cleanup-sessions now' }).isDisabled());

  // Run now that queues: the row says queued, the list is fetched again
  const listFetches = (await requests(page)).filter(entry => entry === `GET ${PREFIX}/list`).length;
  await page.getByRole('button', { name: 'Run send-reminders now' }).click();
  await waitForRequest(page, new RegExp(`POST ${PREFIX}/1/run-now`));
  await rowOf('send-reminders').locator('[data-cron-queued]').waitFor({ timeout: 10_000 });
  await page.waitForFunction(
    ({ count, path }) => (window.__operationsRequests ?? []).filter(entry => entry === `GET ${path}/list`).length > count,
    { count: listFetches, path: PREFIX },
    { timeout: 10_000 },
  );
  report('crons: Run now queues (the row says so) and the list is fetched again', true);

  // create: schedule preview, a 400 on the name field
  await page.getByRole('button', { name: 'Add Cron' }).click();
  const drawer = page.getByRole('dialog');
  await drawer.locator('input[name="name"]').fill('send-reminders');
  await drawer.locator('textarea[name="description"]').fill('Sends the reminder mails a second time');
  await drawer.getByRole('combobox', { name: 'Command' }).click();
  await page.getByRole('option', { name: /app:reminders:send/ }).click();
  await drawer.locator('input[name="schedule"]').fill('*/10 * * * *');
  await waitForRequest(page, new RegExp(`GET ${PREFIX}/schedule-preview\\?schedule=\\*%2F10%20\\*%20\\*%20\\*%20\\*`));
  await drawer.locator('[data-slot="cron-schedule-preview"] li').first().waitFor({ timeout: 10_000 });
  report('crons: the schedule preview shows the next runs', (await drawer.locator('[data-slot="cron-schedule-preview"] li').count()) === 5);
  await drawer.getByRole('button', { name: 'Create Cron' }).click();
  await waitForRequest(page, new RegExp(`POST ${PREFIX} \\{"name":"send-reminders"`));
  await drawer.getByText('This name is already used by another Cron.').first().waitFor({ timeout: 10_000 });
  report('crons: a 400 is placed on its field (name invalid)', (await drawer.locator('input[name="name"]').getAttribute('aria-invalid')) === 'true');
  await drawer.locator('input[name="name"]').fill('send-reminders-again');
  await drawer.getByRole('button', { name: 'Create Cron' }).click();
  await drawer.waitFor({ state: 'detached', timeout: 10_000 });
  await rowOf('send-reminders-again').waitFor({ timeout: 10_000 });
  report('crons: the created Cron appears after the refetch', true);

  // edit: only the changed field is sent
  await page.getByRole('button', { name: 'Edit send-reminders', exact: true }).click();
  const editDrawer = page.getByRole('dialog');
  await editDrawer.locator('input[name="schedule"]').fill('0 7 * * *');
  await editDrawer.getByRole('button', { name: 'Save' }).click();
  await waitForRequest(page, new RegExp(`PATCH ${PREFIX}/1 `));
  const patch = (await requests(page)).find(entry => entry.startsWith(`PATCH ${PREFIX}/1 `));
  report('crons: an edit sends only the changed field', patch === `PATCH ${PREFIX}/1 {"schedule":"0 7 * * *"}`, patch);
  await editDrawer.waitFor({ state: 'detached', timeout: 10_000 });

  // delete behind the typed name
  await page.getByRole('button', { name: 'Delete cleanup-sessions' }).click();
  const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).filter({ hasText: 'Delete cleanup-sessions?' });
  await confirmDialog.waitFor({ timeout: 10_000 });
  const deleteButton = confirmDialog.getByRole('button', { name: 'Delete' });
  const offBeforeTyping = await deleteButton.isDisabled();
  await confirmDialog.getByLabel('Type “cleanup-sessions” to confirm').fill('cleanup-sessions');
  const onAfterTyping = await deleteButton.isEnabled();
  await deleteButton.click();
  await waitForRequest(page, new RegExp(`DELETE ${PREFIX}/4`));
  await rowOf('cleanup-sessions').waitFor({ state: 'detached', timeout: 10_000 });
  report('crons: delete asks for the typed name (off until typed) and removes the row', offBeforeTyping && onAfterTyping);

  // runs: the result filter
  await page.getByRole('button', { name: 'Runs', exact: true }).click();
  await page.locator('[data-slot="cron-timeline"]').waitFor({ timeout: 10_000 });
  await page.locator('[data-slot="cron-runs-view"]').getByRole('radio', { name: 'Failed' }).click();
  await waitForRequest(page, new RegExp(`GET ${PREFIX}/executions/list\\?result=FAILED&limit=50&offset=0`));
  report('crons: the Failed tab requests result=FAILED', true);
  await page.locator('[data-slot="cron-runs-view"] tbody tr').first().click();
  await page.locator('[data-slot="cron-execution-output"]').waitFor({ timeout: 10_000 });
  report('crons: a run opens its full output', /Connection refused/.test((await page.locator('[data-slot="cron-execution-output"]').textContent()) ?? ''));
  await page.keyboard.press('Escape');

  report('crons: no console error or hydration warning', problems.length === 0, problems.join(' | '));
  await page.close();

  await checkPhoneWidth('crons', '/operations/crons', '[data-slot="crons-table"] tbody tr');
  await checkPhoneWidth('crons runs', '/operations/crons?view=runs', '[data-slot="cron-timeline"]');
};
