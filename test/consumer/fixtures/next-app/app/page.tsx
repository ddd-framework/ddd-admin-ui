// T1: a server page that translates its metadata with m() and calls pure helpers while rendering.
import { m } from '@mgamadeus/ddd-admin-ui/i18n';
import { defineStatusMap, formatDate } from '@mgamadeus/ddd-admin-ui/logic';
import { PageFrame } from '@mgamadeus/ddd-admin-ui/page';

export const metadata = { title: m('Users') };

const statuses = defineStatusMap({
  ACTIVE: { label: 'Active', tone: 'success' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
});

export default function UsersPage() {
  return (
    <PageFrame title={m('Users')}>
      <p id="created">{formatDate('2026-03-04')}</p>
      <p id="status">{statuses.ACTIVE.label}</p>
    </PageFrame>
  );
}
