// The ./crons screens (server render) on the sample payloads of ./showcase through the static api: tiles, one row per
// Cron with its status badge, no Run now for a Cron whose command is missing, no countdown for a paused one, the
// runner banner when every active Cron is overdue, the runs and the timeline, and WriteAccessProvider disables every
// write with its reason.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CronRunnerBanner, CronRunsView, CronsScreen, CronTimelineCard, createStaticCronsApi } from '@mgamadeus/ddd-admin-ui/crons';
import { WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { showcaseCronsData } from '@mgamadeus/ddd-admin-ui/showcase';

const api = createStaticCronsApi(showcaseCronsData);
const render = (element, writeAccess) =>
  renderToStaticMarkup(h(AdminUiProvider, null, writeAccess ? h(WriteAccessProvider, { value: writeAccess }, element) : element));
const READ_ONLY = { allowed: false, reason: 'Read-only workspace' };
const count = (html, pattern) => (html.match(pattern) ?? []).length;
/** Opening tags of the buttons whose tag or content contains `name`. */
const buttonsNamed = (html, name) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)].filter(match => match[0].includes(name)).map(match => /^<button\b[^>]*>/.exec(match[0])[0]);
const allDisabled = buttons => buttons.length > 0 && buttons.every(button => / disabled=""/.test(button));
const noneDisabled = buttons => buttons.length > 0 && buttons.every(button => !/ disabled=""/.test(button));
const rowOf = (html, name) => [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0]).find(row => row.includes(`>${name}<`)) ?? '';

const screen = render(h(CronsScreen, { api, pollingIntervalMs: 0, tick: false }));
const readOnly = render(h(CronsScreen, { api, pollingIntervalMs: 0, tick: false }), READ_ONLY);
const runs = render(h(CronRunsView, { api, result: 'ALL', onResultChange: () => {}, pollingIntervalMs: 0 }));
const failedRuns = render(h(CronRunsView, { api, result: 'FAILED', onResultChange: () => {}, pollingIntervalMs: 0 }));
const timeline = render(h(CronTimelineCard, { api, hours: '24', onHoursChange: () => {} }));
const runner = showcaseCronsData.list.runner;
const stalled = render(h(CronRunnerBanner, { runner: { ...runner, activeCount: 2, overdueCount: 2 } }));
const healthy = render(h(CronRunnerBanner, { runner }));

const missingRow = rowOf(screen, 'export-legacy-report');
const pausedRow = rowOf(screen, 'sample-workers');
const okRow = rowOf(screen, 'send-reminders');
const switches = html => [...html.matchAll(/<button[^>]*role="switch"[^>]*>/g)].map(match => match[0]);

const checks = [
  ['crons screen: summary tiles', screen.includes('data-slot="cron-summary-tiles"') && count(screen, /data-slot="metric-tile"/g) >= 4],
  ['crons screen: one row per Cron, sorted as sent', count(screen, /<tr\b/g) >= 7 && screen.indexOf('>send-reminders<') < screen.indexOf('>export-legacy-report<')],
  ['crons screen: status badges of CRON_STATUS', ['>OK<', '>Failing<', '>Running<', '>Overdue<', '>Paused<', '>Command missing<'].every(label => screen.includes(label))],
  ['crons screen: a schedule in words beside its expression', screen.includes('Every 5 minutes') && screen.includes('*/5 * * * *') && screen.includes('Daily at 03:00')],
  ['crons screen: the next run counted down against the server clock', okRow.includes('data-cron-next="due"') && /in 3 min/.test(okRow)],
  ['crons screen: no countdown for a paused Cron', pausedRow.includes('data-cron-next="none"') && pausedRow.includes('Paused: no next run')],
  ['crons screen: no Run now for a Cron whose command is missing', missingRow !== '' && !missingRow.includes('aria-label="Run export-legacy-report now"') && okRow.includes('aria-label="Run send-reminders now"')],
  ['crons screen: run strips drawn', count(screen, /data-slot="cron-run-strip"/g) === 6],
  ['crons screen: writes enabled with write access', noneDisabled(buttonsNamed(screen, 'Add Cron')) && noneDisabled(buttonsNamed(okRow, 'aria-label="Run send-reminders now"')) && switches(okRow).every(button => !/ disabled=""/.test(button))],
  [
    'crons screen: every write disabled without write access, with the reason',
    allDisabled(buttonsNamed(readOnly, 'Add Cron')) &&
      allDisabled(buttonsNamed(readOnly, 'aria-label="Run ')) &&
      allDisabled(buttonsNamed(readOnly, 'aria-label="Edit ')) &&
      allDisabled(buttonsNamed(readOnly, 'aria-label="Delete ')) &&
      switches(readOnly).length === 6 &&
      switches(readOnly).every(button => / disabled=""/.test(button)) &&
      readOnly.includes('<span class="sr-only">Read-only workspace</span>'),
  ],
  ['crons screen: tooltips instead of native titles, rows open by keyboard', screen.includes('data-slot="control-hint"') && !/<(?:span|code)(?![^>]*data-slot="badge")[^>]* title="/.test(screen) && /<tr[^>]*tabindex="0"/.test(screen)],
  ['runner banner: every active Cron overdue', stalled.includes('The runner is not running') && healthy === ''],
  ['runs view: result tabs, rows, the pager by total', runs.includes('role="radiogroup"') && runs.includes('data-slot="cron-runs-pager"') && runs.includes('of 154')],
  ['runs view: the failed tab lists failed runs only', failedRuns.includes('>Failed<') && !failedRuns.includes('>Successful</span></span></td>')],
  ['timeline: one lane per Cron, cells with counts', count(timeline, /data-cron-lane=/g) === 6 && timeline.includes('runs, ') && timeline.includes('no run') && timeline.includes('data-readout=') && !timeline.includes(' title="')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
