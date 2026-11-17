import { BellOff, CircleAlert, CircleCheck } from 'lucide-react';

import { m } from '../i18n/store.ts';
import { defineStatusMap } from '../logic/pure/status.ts';
import type { IssueGroupStatus } from './types.ts';

/** `IssueGroupSummary.status`: open needs a fix, resolved waits for a regression, ignored is silenced for good. */
export const ISSUE_GROUP_STATUS = defineStatusMap<IssueGroupStatus>(
  {
    OPEN: {
      label: m('Open', { context: 'issue-status' }),
      tone: 'danger',
      icon: CircleAlert,
      description: m('Not fixed yet: every new event counts here', { context: 'issue-status' }),
    },
    RESOLVED: {
      label: m('Resolved', { context: 'issue-status' }),
      tone: 'success',
      icon: CircleCheck,
      description: m('Fixed in a deploy: a later event reopens it as a regression', { context: 'issue-status' }),
    },
    IGNORED: {
      label: m('Ignored', { context: 'issue-status' }),
      tone: 'neutral',
      icon: BellOff,
      description: m('Silenced for good: it never alerts again, also not as a regression', { context: 'issue-status' }),
    },
  },
  { context: 'issue-status' }
);

/** A status of the payload as one of the map's keys (anything unknown stays as it is: a neutral badge). */
export const toIssueGroupStatus = (status: string | null | undefined): IssueGroupStatus | null =>
  status === 'OPEN' || status === 'RESOLVED' || status === 'IGNORED' ? status : null;
