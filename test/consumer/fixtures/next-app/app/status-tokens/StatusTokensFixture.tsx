'use client';

import type { CSSProperties } from 'react';
import { StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { StatusCallout } from '@mgamadeus/ddd-admin-ui/page';

const TONES = [
  { tone: 'success', status: 'success' },
  { tone: 'warning', status: 'warning' },
  { tone: 'danger', status: 'destructive' },
  { tone: 'info', status: 'info' },
] as const;

// a scope where the host's text roles are unset again (`initial` = guaranteed-invalid: every var() takes its fallback)
const UNSET = Object.fromEntries(TONES.flatMap(({ status }) => [[`--${status}-text`, 'initial'], [`--${status}-soft`, 'initial']])) as CSSProperties;

const Badges = ({ scope }: { scope: string }) => (
  <div className="flex flex-wrap gap-2 bg-card p-4">
    {TONES.map(({ tone, status }) => (
      <span key={tone} className="contents">
        <span data-token-badge={`${scope}-${status}`}>
          <StatusBadge tone={tone} label={tone} />
        </span>
        {/* what 0.2.1 drew: the status colour as text on its 15 % tint */}
        <span
          data-token-reference={`${scope}-${status}`}
          style={{ color: `var(--${status})`, backgroundColor: `color-mix(in oklab, var(--${status}) 15%, transparent)` }}
        >
          {tone}
        </span>
        <span data-token-host-text={`${scope}-${status}`} style={{ color: `var(--${status}-text)` }}>
          {tone}
        </span>
      </span>
    ))}
    <span data-token-callout={scope}>
      <StatusCallout tone="success" title="Saved" />
    </span>
  </div>
);

/** StatusBadge and StatusCallout with the fixture's text roles, and in a scope where they are unset. */
export function StatusTokensFixture() {
  return (
    <main className="space-y-6 p-6">
      <section id="with-host-tokens">
        <Badges scope="host" />
      </section>
      <section id="without-host-tokens" style={UNSET}>
        <Badges scope="unset" />
      </section>
    </main>
  );
}
