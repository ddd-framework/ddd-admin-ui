'use client';

import { ExternalLink, Lock } from 'lucide-react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { NavigationIcon, NavigationLeaf } from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import { NAV_BADGE_CLASS, NAV_ICON_CLASS } from './navClasses.ts';

type MarkedItem = Pick<NavigationLeaf<string>, 'badge' | 'lockedReason' | 'external' | 'externalLabel'>;

/** The text a screen reader hears for the marks of an entry (lock reason, external), translated. */
export const useNavMarkText = (item: MarkedItem): string[] => {
  const { t } = useTranslate();
  const texts: string[] = [];
  if (item.lockedReason) texts.push(t(item.lockedReason));
  if (item.external) texts.push(item.externalLabel ? t(item.externalLabel) : t('Opens outside this app'));
  return texts;
};

/**
 * The marks at the end of a labelled row: the waiting count, a lock (the reason as hidden text), the external mark. A
 * badge `0` renders nothing.
 */
export const NavItemMarks = ({ item }: { item: MarkedItem }) => {
  const { t } = useTranslate();
  return (
    <>
      {!!item.badge && <span className={NAV_BADGE_CLASS}>{item.badge}</span>}
      {item.lockedReason && (
        <>
          <Lock aria-hidden className={cn('size-3.5 shrink-0 opacity-70', !item.badge && 'ms-auto')} />
          <span className="sr-only">{t(item.lockedReason)}</span>
        </>
      )}
      {item.external && (
        <>
          <ExternalLink aria-hidden className={cn('size-3 shrink-0 opacity-50 rtl:-scale-x-100', !item.badge && !item.lockedReason && 'ms-auto')} />
          <span className="sr-only">{item.externalLabel ? t(item.externalLabel) : t('Opens outside this app')}</span>
        </>
      )}
    </>
  );
};

/**
 * An entry's icon where no label sits beside it (the rail): the count pinned to its upper corner, a small lock to its
 * lower corner, so every icon stays on one axis. The texts are read through the link's label.
 */
export const MarkedNavIcon = ({ icon: Icon, item }: { icon?: NavigationIcon; item: MarkedItem }) => (
  <span data-nav-icon="" className="relative inline-flex shrink-0">
    {Icon ? <Icon aria-hidden className={NAV_ICON_CLASS} /> : <span aria-hidden className="size-[1.125rem]" />}
    {item.lockedReason && (
      <Lock aria-hidden className="absolute -end-1 -bottom-1 size-2.5! rounded-full bg-background" />
    )}
    {!!item.badge && (
      <span
        aria-hidden
        className="absolute -end-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] leading-none font-bold text-primary-foreground tabular-nums"
      >
        {item.badge}
      </span>
    )}
  </span>
);
