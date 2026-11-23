// The sandbox texts translate with their contexts: state badges (map context), tab labels (EntityTab.context), the
// list card's name (labelContext), and the audit's "Kill job %id%" as one interpolated text.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListCard, StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { EntityTabs } from '@mgamadeus/ddd-admin-ui/page';
import { SANDBOX_COMMAND_STATE, SANDBOX_DETAIL_TABS, SANDBOX_STATE } from '@mgamadeus/ddd-admin-ui/sandbox';

setTranslations('de', 'FORMAL', {
  'Offloaded__sandbox-state': 'Ausgelagert',
  'Idle__sandbox-state': 'Ruhend',
  'Processes & jobs__sandbox-tab': 'Prozesse & Jobs',
  'Session log__sandbox-tab': 'Sitzungsprotokoll',
  'Audit__sandbox-tab': 'Protokoll',
  'Killed__sandbox-command-state': 'Abgebrochen',
});
const badge = (value, map) => renderToStaticMarkup(h(StatusBadge, { value, map }));
const tabs = renderToStaticMarkup(h(EntityTabs, { tabs: SANDBOX_DETAIL_TABS, activeId: 'files', onSelect: () => {}, 'aria-label': 'Tabs' }));
const card = renderToStaticMarkup(h(EntityListCard, { label: 'Audit', labelContext: 'sandbox-tab' }, h('div')));
const checks = [
  ['state badge Offloaded', badge('OFFLOADED', SANDBOX_STATE).includes('>Ausgelagert<')],
  ['state badge Idle', badge('IDLE', SANDBOX_STATE).includes('>Ruhend<')],
  ['command state Killed', badge('KILLED', SANDBOX_COMMAND_STATE).includes('>Abgebrochen<')],
  ['tab Processes & jobs', tabs.includes('Prozesse &amp; Jobs')],
  ['tab Session log', tabs.includes('Sitzungsprotokoll')],
  ['tab Audit', tabs.includes('>Protokoll<')],
  ['list card name with context', card.includes('aria-label="Protokoll"')],
];
setTranslations('en', 'FORMAL', {});
let failedChecks = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failedChecks = true;
}
if (failedChecks) process.exit(1);
