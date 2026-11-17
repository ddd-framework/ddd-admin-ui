// ./issues on RTK Query (app/operations/issues): the list and the trend request the trait's paths with the screen's
// filters (status tab, environment, search), the filters live in the URL, a row opens the drawer with its occurrences
// and frames, Resolve posts and the list is fetched again without the group, the read-only page disables the status
// actions, 390 px with a throttled CPU, no console error or hydration warning.
const PREFIX = '/api/admin/common/issues';

export const run = async ({ openPage, report, requests, waitForRequest, checkPhoneWidth }) => {
  {
    const { page, problems } = await openPage('/operations/issues');
    await page.locator('tr', { hasText: 'RuntimeException' }).first().waitFor({ timeout: 15_000 });
    const first = await requests(page);
    report('issues: the list is requested on the trait path (environment omitted, Open tab, first page)', first.includes(`GET ${PREFIX}/groups/list?status=OPEN&limit=50&offset=0`), first.join(' | '));
    await waitForRequest(page, /GET \/api\/admin\/common\/issues\/trend\?environment=production&status=OPEN&from=2026-01-30T10%3A00%3A00Z&to=2026-01-31T10%3A00%3A00Z/);
    report('issues: the trend follows the resolved environment and the list filters over 24 hours', true);
    await page.waitForSelector('[data-slot="issues-trend-chart"] rect');

    await page.getByRole('radio', { name: /^Resolved/ }).click();
    await waitForRequest(page, /groups\/list\?(environment=production&)?status=RESOLVED&limit=50&offset=0/);
    await page.locator('tr', { hasText: 'PDOException' }).first().waitFor({ timeout: 10_000 });
    await page.waitForURL(/status=RESOLVED/, { timeout: 5000 }).catch(() => {});
    report('issues: the Resolved tab lists the resolved group, the tab is in the URL', page.url().includes('status=RESOLVED'), page.url());
    await page.getByRole('radio', { name: /^Open/ }).click();

    await page.getByRole('radio', { name: 'staging' }).click();
    await waitForRequest(page, /groups\/list\?environment=staging&status=OPEN/);
    await page.getByText('Error collection is not running').waitFor({ timeout: 10_000 });
    report('issues: the environment switch requests staging and shows its stalled registry', true);
    await page.getByRole('radio', { name: 'production' }).click();
    await page.locator('tr', { hasText: 'RuntimeException' }).first().waitFor({ timeout: 10_000 });

    await page.getByLabel('Search errors').fill('price');
    await waitForRequest(page, /groups\/list\?environment=production&status=OPEN&search=price/);
    await page.waitForURL(/q=price/, { timeout: 5000 }).catch(() => {});
    report('issues: the search reaches the list and the URL', page.url().includes('q=price'), page.url());
    await page.getByLabel('Search errors').fill('');
    await page.locator('tr', { hasText: 'RuntimeException' }).first().waitFor({ timeout: 10_000 });

    await page.locator('tr', { hasText: 'RuntimeException' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('[data-slot="issue-frames"]').first().waitFor({ timeout: 10_000 });
    const drawer = await dialog.evaluate(element => ({
      current: element.querySelectorAll('[data-current]').length,
      occurrences: element.querySelectorAll('[data-slot="issue-occurrences"] > details').length,
      logBackend: element.querySelector('[data-slot="issue-log-backend-link"]')?.getAttribute('target') ?? null,
    }));
    report('issues: the drawer shows the occurrences, the code context and the log backend link', drawer.current > 0 && drawer.occurrences === 2 && drawer.logBackend === '_blank', JSON.stringify(drawer));
    await waitForRequest(page, /GET \/api\/admin\/common\/issues\/trend\?environment=production&groupHash=a1f04c9e2b7d4c55&from=/);
    report('issues: the drawer is in the URL and its sparkline asks for the group alone', page.url().includes('issue=production%3Aa1f04c9e2b7d4c55'), page.url());

    const listsBefore = (await requests(page)).filter(entry => entry.startsWith(`GET ${PREFIX}/groups/list`)).length;
    await dialog.getByRole('button', { name: 'Resolve' }).click();
    await waitForRequest(page, /POST \/api\/admin\/common\/issues\/groups\/production\/a1f04c9e2b7d4c55\/resolve/);
    await dialog.getByRole('button', { name: 'Reopen' }).waitFor({ timeout: 10_000 });
    await page.waitForFunction(
      ([prefix, count]) => (window.__operationsRequests ?? []).filter(entry => entry.startsWith(`GET ${prefix}/groups/list`)).length > count,
      [PREFIX, listsBefore],
      { timeout: 10_000 },
    );
    report('issues: Resolve posts, the drawer shows the new status and the list is fetched again', true);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 10_000 });
    await page.waitForTimeout(300);
    report('issues: the resolved group left the Open tab', (await page.locator('tr', { hasText: 'RuntimeException' }).count()) === 0);
    report('issues: no console error or hydration warning', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  {
    const { page, problems } = await openPage('/operations/issues/readonly');
    await page.locator('tr', { hasText: 'LogicException' }).first().click({ timeout: 15_000 });
    const resolve = page.getByRole('dialog').getByRole('button', { name: 'Resolve' });
    await resolve.waitFor({ timeout: 10_000 });
    report('issues (read-only): Resolve and Ignore are disabled with the reason',
      (await resolve.isDisabled()) && (await page.getByRole('dialog').getByRole('button', { name: 'Ignore' }).isDisabled()) && (await resolve.getAttribute('title')) === 'Read-only workspace');
    report('issues (read-only): no console error', problems.length === 0, problems.join(' | '));
    await page.close();
  }

  await checkPhoneWidth('issues', '/operations/issues', '[data-slot="issues-trend-chart"]');
};
