// The ./database screen on RTK Query (app/operations/database): an apply sends the signature it showed and the answer
// replaces the list without a second GET; a mixed table asks for its name; Apply selected and Apply all ask for their
// phrase (the confirm button stays off until it is typed) and send the flat table list or null; the signature
// mismatch shows the reload banner, the busy apply lock its message; on a process with schema writes disabled the 403
// is shown and every write turns off; the generated SQL and model code are text previews; 390 px with a slow CPU.
const card = (page, table) => page.locator(`[data-slot="schema-diff-card"][data-table="${table}"]`);
const countOf = (entries, pattern) => entries.filter(entry => pattern.test(entry)).length;

export const run = async ({ openPage, report, requests, waitForRequest, checkPhoneWidth }) => {
  // applies, confirmations and errors
  {
    const { page, problems } = await openPage('/operations/database');
    await page.waitForSelector('[data-slot="schema-diff-card"]');
    report('database: the diff is requested on the trait path', (await requests(page)).includes('GET /api/admin/common/databaseModels/diff'));
    report('database: five cards, the blocked one without Apply', (await page.locator('[data-slot="schema-diff-card"]').count()) === 5 && (await card(page, 'Products').getByRole('button', { name: /^Apply/ }).count()) === 0);

    // a mixed table: the confirmation asks for the table name
    const diffGets = countOf(await requests(page), /^GET .*\/diff$/);
    await card(page, 'Orders').getByRole('button', { name: 'Apply the diff of Orders' }).click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
    await dialog.waitFor();
    const confirmButton = dialog.getByRole('button', { name: 'Apply', exact: true });
    const phrase = dialog.getByLabel('Type “Orders” to confirm');
    report('database: a mixed apply needs the table name typed', await confirmButton.isDisabled());
    await phrase.fill('Orders');
    await confirmButton.click();
    await waitForRequest(page, /POST \/api\/admin\/common\/databaseModels\/applyDiff .*"sqlTableName":"Orders","expectedDiffSignature":"7b9e2d14c6a84f03b5d1e8c2a9f7046d","disableForeignKeyChecks":true/);
    await card(page, 'Orders').waitFor({ state: 'detached', timeout: 10_000 });
    await page.waitForTimeout(200);
    report('database: the apply sends the shown signature and its answer replaces the list (no second GET)', countOf(await requests(page), /^GET .*\/diff$/) === diffGets);

    // a busy lock and a changed diff
    await card(page, 'AuditEntries').getByRole('button', { name: 'Apply the diff of AuditEntries' }).click();
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).first().getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByText('Another apply is running — retry in a few seconds').waitFor({ timeout: 10_000 });
    report('database: a busy apply lock says to retry', true);
    await card(page, 'Accounts').getByRole('button', { name: 'Apply the diff of Accounts' }).click();
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).first().getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByText('The schema changed since you loaded it').waitFor({ timeout: 10_000 });
    const before = countOf(await requests(page), /^GET .*\/diff$/);
    await page.getByRole('status').filter({ hasText: 'The schema changed since you loaded it' }).getByRole('button', { name: 'Reload' }).click();
    await page.waitForFunction(count => (window.__operationsRequests ?? []).filter(entry => /^GET .*\/diff$/.test(entry)).length > count, before, { timeout: 10_000 });
    report('database: a signature mismatch shows the banner, Reload fetches the diff again', true);

    // Apply selected: the flat table list, the phrase
    await page.waitForFunction(() => !document.body.textContent?.includes('The schema changed since you loaded it'));
    await card(page, 'ExportJobs').getByRole('checkbox', { name: 'Select ExportJobs' }).click();
    await page.getByRole('button', { name: 'Apply selected (1)' }).click();
    const selectedDialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
    const applySelected = selectedDialog.getByRole('button', { name: 'Apply selected' });
    await selectedDialog.getByLabel('Type “APPLY SELECTED” to confirm').fill('APPLY SELECT');
    const offWhilePartial = await applySelected.isDisabled();
    await selectedDialog.getByLabel('Type “APPLY SELECTED” to confirm').fill('APPLY SELECTED');
    await applySelected.click();
    await waitForRequest(page, /POST \/api\/admin\/common\/databaseModels\/applyDiffs .*"sqlTableNames":\["ExportJobs"\],"expectedDiffSignatures":\{"elements":\[/);
    await card(page, 'ExportJobs').waitFor({ state: 'detached', timeout: 10_000 });
    report('database: Apply selected asks for its phrase and sends the flat table list with the signatures', offWhilePartial);

    // Apply all: the blocked table stays out by name
    await page.getByRole('button', { name: 'Apply all' }).click();
    const allDialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
    await allDialog.getByText('1 blocked diff is left out.', { exact: false }).waitFor();
    await allDialog.getByLabel('Type “APPLY ALL” to confirm').fill('APPLY ALL');
    await allDialog.getByRole('button', { name: 'Apply all' }).click();
    await waitForRequest(page, /POST .*\/applyDiffs .*"sqlTableNames":\["Accounts","AuditEntries"\]/);
    await page.locator('[data-slot="schema-diff-card"]').nth(1).waitFor({ state: 'detached', timeout: 10_000 });
    report('database: Apply all leaves the blocked table out and names the others', (await page.locator('[data-slot="schema-diff-card"]').count()) === 1);

    // text previews
    await page.locator('[data-slot="generated-code-panel"][data-kind="models"]').getByRole('button', { name: 'Show' }).click();
    await waitForRequest(page, /GET \/api\/admin\/common\/databaseModels\/generateDoctrineModels \(text\)/);
    await page.locator('[data-slot="generated-code-panel"][data-kind="models"] pre').waitFor();
    const models = await page.locator('[data-slot="generated-code-panel"][data-kind="models"] pre').textContent();
    const entityPanel = page.locator('[data-slot="generated-code-panel"][data-kind="entity"]');
    await entityPanel.getByLabel('Entity class name').fill('Ambiguous');
    await entityPanel.getByRole('button', { name: 'Show' }).click();
    await entityPanel.getByText('is ambiguous').waitFor({ timeout: 10_000 });
    report('database: the model code is a text preview; an ambiguous entity name shows the message', /class DBAccountModel/.test(models ?? ''));
    report('database: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  // schema writes disabled: 403
  {
    const { page, problems } = await openPage('/operations/database/forbidden');
    await page.waitForSelector('[data-slot="schema-diff-card"]');
    await card(page, 'Accounts').getByRole('button', { name: 'Apply the diff of Accounts' }).click();
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).first().getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByText('Schema writes are disabled on this process', { exact: true }).waitFor({ timeout: 10_000 });
    const applyOff = await card(page, 'Orders').getByRole('button', { name: 'Apply the diff of Orders' }).isDisabled();
    const allOff = await page.getByRole('button', { name: 'Apply all' }).isDisabled();
    report('database (403): the message is shown and every write turns off', applyOff && allOff);
    await page.locator('[data-slot="generated-code-panel"][data-kind="tables"]').getByRole('button', { name: 'Show' }).click();
    await page.locator('[data-slot="generated-code-panel"][data-kind="tables"]').getByText('Not available on this process').waitFor({ timeout: 10_000 });
    report('database (403): the tables SQL shows the refusal', true);
    report('database (403): no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  await checkPhoneWidth('database', '/operations/database', '[data-slot="schema-diff-card"]');
};
