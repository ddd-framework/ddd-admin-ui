'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import type { StatusDefinition, StatusMap, StatusTone } from '../logic/pure/status.ts';
import { cn } from '../primitives/cn.ts';
import { EmptyValue } from './EmptyValue.tsx';

/** @deprecated moved to logic/pure/status — the re-export is removed in a later minor */
export { defineStatusMap } from '../logic/pure/status.ts';
/** @deprecated moved to logic/pure/status — the re-export is removed in a later minor */
export type { StatusDefinition, StatusMap, StatusTone } from '../logic/pure/status.ts';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/15 text-destructive',
  highlight: 'bg-primary text-primary-foreground',
  brand: 'bg-brand/15 text-brand-emphasis',
};

interface StatusBadgeBaseProps {
  className?: string;
}

interface StatusBadgeToneProps extends StatusBadgeBaseProps {
  tone: StatusTone;
  label: ReactNode;
  icon?: LucideIcon;
  title?: string;
  value?: never;
  map?: never;
}

interface StatusBadgeMapProps<TValue extends string> extends StatusBadgeBaseProps {
  /** The entity's value; `null` / `undefined` / `''` → `—`, a value missing from the map → a neutral badge with it. */
  value: TValue | null | undefined;
  map: StatusMap<TValue>;
  tone?: never;
  label?: never;
  icon?: never;
  title?: never;
}

export type StatusBadgeProps<TValue extends string = string> = StatusBadgeToneProps | StatusBadgeMapProps<TValue>;

const isMapped = <TValue extends string>(props: StatusBadgeProps<TValue>): props is StatusBadgeMapProps<TValue> =>
  props.map !== undefined;

/**
 * The status badge of every list, card and detail (colour + icon + label, rounded pill). Either explicit
 * (`tone` + `label` + `icon`) or from a family map (`value` + `map`).
 */
export const StatusBadge = <TValue extends string = string>(props: StatusBadgeProps<TValue>) => {
  const { t } = useTranslate();
  let tone: StatusTone;
  let label: ReactNode;
  let Icon: LucideIcon | undefined;
  let title: string | undefined;

  if (isMapped(props)) {
    const { value, map } = props;
    if (value === null || value === undefined || value === '') return <EmptyValue />;
    const definition = (map as Partial<Record<string, StatusDefinition>>)[value];
    tone = definition?.tone ?? 'neutral';
    label = definition ? t(definition.label) : value;
    Icon = definition?.icon;
    title = definition?.description ? t(definition.description) : undefined;
  } else {
    ({ tone, label, icon: Icon, title } = props);
  }

  return (
    <Badge variant="outline" title={title} className={cn('border-transparent', TONE_CLASS[tone], props.className)}>
      {Icon && <Icon aria-hidden />}
      {label}
    </Badge>
  );
};
