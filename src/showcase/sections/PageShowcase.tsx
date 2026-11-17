'use client';

import { Calendar, KeyRound, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';

import { EntityListTable, StatusBadge } from '../../list/index.ts';
import {
  AddEntityButton,
  AnchorLink,
  CardGrid,
  DefinitionList,
  DetailHeader,
  EditableCard,
  EntityDetailShell,
  EntityListPage,
  EntityMetadata,
  EntityTabs,
  ExportButton,
  IconValue,
  IconValueRow,
  MoreActionsMenu,
  PageFrame,
  PageHeader,
  PageSections,
  PageToolbar,
  SectionHeader,
  StatusCallout,
  StatusCalloutAction,
} from '../../page/index.ts';
import { Button, Card, CardContent } from '../../primitives/index.ts';
import { SHOWCASE_ROWS, SHOWCASE_STATUS, type ShowcaseRow } from './ListShowcase.tsx';
import { Sample, Samples } from './PrimitivesShowcase.tsx';
import { PageAdditionsShowcase } from './PageAdditionsShowcase.tsx';

const CHANGE_HISTORY = { createdTime: '2026-01-10 08:30:00', modifiedTime: '2026-03-04 16:45:00' };
const TABS = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'members', label: 'Members', href: '#members', count: 12 },
  { id: 'settings', label: 'Settings', href: '#settings' },
];
const MORE_ACTIONS = [
  { id: 'recalculate', label: 'Recalculate totals', icon: <RefreshCw />, onSelect: () => {} },
  { id: 'reset', label: 'Reset everything', onSelect: () => {}, destructive: true, separatorBefore: true },
];

/** The `./page` section. */
export const PageShowcase = () => {
  const [tab, setTab] = useState('people');
  const [routeTab, setRouteTab] = useState('overview');
  return (
    <div className="space-y-8">
      <Sample title="PageFrame + PageHeader + PageToolbar">
        <div className="w-full overflow-hidden rounded-2xl border">
          <PageFrame
            title="Projects"
            description="Everything the team is working on."
            minHeightClassName="min-h-0"
            asSpecimen
            actions={
              <PageToolbar
                exportAction={<ExportButton onExport={() => {}} />}
                moreActions={MORE_ACTIONS}
                primaryAction={<AddEntityButton entity="Project" onClick={() => {}} />}
              >
                <Button variant="outline">Import</Button>
              </PageToolbar>
            }
          >
            <p className="text-sm text-muted-foreground">Page content.</p>
          </PageFrame>
        </div>
      </Sample>
      <Sample title="EntityListPage">
        <div className="h-96 w-full overflow-hidden rounded-2xl border">
          <EntityListPage asSpecimen title="Items" headerActions={<AddEntityButton label="New item" onClick={() => {}} />}>
            <EntityListTable<ShowcaseRow>
              columns={[
                { id: 'name', header: 'Name', cell: row => row.name },
                { id: 'status', header: 'Status', cell: row => <StatusBadge value={row.status} map={SHOWCASE_STATUS} /> },
              ]}
              items={SHOWCASE_ROWS.slice(0, 3)}
              getRowKey={row => String(row.id)}
            />
          </EntityListPage>
        </div>
      </Sample>
      <Sample title="EntityDetailShell">
        <div className="w-full overflow-hidden rounded-2xl border p-4">
          <EntityDetailShell
            title="Sample project"
            fallbackTitle="Project #42"
            description="Workspace North"
            back={{ href: '#projects', label: 'Back to projects' }}
            linkComponent={AnchorLink}
            metadata={{ id: 42, changeHistory: CHANGE_HISTORY }}
            tabs={TABS}
            currentPath="#overview"
            tabsLabel="Project sections"
            actions={<PageToolbar moreActions={MORE_ACTIONS} />}
          >
            <p className="text-sm text-muted-foreground">Tab content.</p>
          </EntityDetailShell>
        </div>
      </Sample>
      <Samples>
        <Sample title="PageHeader, DetailHeader">
          <PageHeader title={<>Item <em>Types</em></>} description="A two-tone title." />
          <DetailHeader title="Detail title" description="Detail description" />
          <DetailHeader title="Nested detail" nested />
        </Sample>
        <Sample title="EntityMetadata">
          <EntityMetadata id={42} changeHistory={CHANGE_HISTORY} />
          <EntityMetadata id={42} changeHistory={CHANGE_HISTORY} variant="inline" />
          <EntityMetadata id={42} changeHistory={CHANGE_HISTORY} variant="stacked" />
        </Sample>
        <Sample title="EntityTabs, SectionHeader">
          <EntityTabs aria-label="Route tabs" tabs={TABS} activeId={routeTab} onSelect={setRouteTab} />
          <EntityTabs aria-label="Pill tabs" tabs={TABS} activeId={routeTab} onSelect={setRouteTab} variant="pill" />
          <SectionHeader
            title="Members"
            description="People working on this project"
            tabs={[
              { id: 'people', label: 'People' },
              { id: 'teams', label: 'Teams' },
            ]}
            activeTab={tab}
            onTabSelect={setTab}
            actions={<ExportButton onExport={() => {}} />}
          />
        </Sample>
        <Sample title="StatusCallout">
          <StatusCallout tone="info" title="Information" description="Something worth knowing." />
          <StatusCallout
            tone="warning"
            title="Needs attention"
            description="Two items wait for a review."
            actions={<StatusCalloutAction>Review</StatusCalloutAction>}
          />
          <StatusCallout tone="destructive" title="Failed" size="compact" />
          <StatusCallout tone="success" title="Done" size="compact" />
        </Sample>
        <Sample title="DefinitionList">
          <Card className="w-full">
            <CardContent>
              <DefinitionList
                columns={3}
                items={[
                  { label: 'Access code', value: 'NORTH-42' },
                  { label: 'Owner', value: null },
                  { label: 'Status', value: <StatusBadge value="ACTIVE" map={SHOWCASE_STATUS} />, hint: 'Since March' },
                  { label: 'Description', value: 'A longer description spanning the whole row.', wide: true },
                ]}
              />
            </CardContent>
          </Card>
        </Sample>
        <Sample title="DefinitionList, rows">
          <Card className="w-full">
            <CardContent>
              <DefinitionList
                layout="rows"
                items={[
                  { label: 'Plan', value: 'Team' },
                  { label: 'Seats', value: '12 of 20', hint: '8 free' },
                  { label: 'Renews', value: null },
                ]}
              />
            </CardContent>
          </Card>
        </Sample>
        <Sample title="PageSections, CardGrid, EditableCard, IconValue, MoreActionsMenu">
          <PageSections className="w-full">
            <section>
              <SectionHeader title={<>General <em>settings</em></>} />
              <CardGrid>
                <EditableCard title="Access" onEdit={() => {}} editLabel="Edit access">
                  <IconValueRow>
                    <IconValue icon={<KeyRound />}>NORTH-42</IconValue>
                    <IconValue icon={<Calendar />}>4 Mar 2026</IconValue>
                    <IconValue icon={<Users />}>12 members</IconValue>
                  </IconValueRow>
                </EditableCard>
                <EditableCard title="Danger zone" actions={<MoreActionsMenu items={MORE_ACTIONS} />}>
                  <p className="text-sm text-muted-foreground">Rare actions live in the menu.</p>
                </EditableCard>
              </CardGrid>
            </section>
          </PageSections>
        </Sample>
      </Samples>
      <PageAdditionsShowcase />
    </div>
  );
};
