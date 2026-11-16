'use client';

import { useEffect, useState } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

/** @deprecated moved to form/formPanelClasses — the re-export is removed in a later minor */
export { FORM_PANEL_SCROLL_MARGIN_CLASS } from './formPanelClasses.ts';

export interface FormJumpBarPanel {
  /** The panel wrapper's DOM id. */
  id: string;
  /** Untranslated label (an `m()` text); the bar translates it. */
  label: string;
}

export interface FormJumpBarProps {
  /** The form's panels, top to bottom; each wrapper carries `id` and `FORM_PANEL_SCROLL_MARGIN_CLASS`. */
  panels: readonly FormJumpBarPanel[];
}

/**
 * The small sticky jump bar of a long form with stacked full-width panels ("Challenge · Goal · Reward · Flow"): a glass
 * pill with one link per panel; the panel in view is marked. From `lg` it sits left of the sticky `FormActions` pill
 * at the same height, below it under its own row (the action pill takes the full row there). Write it first inside
 * the `<Form>`, before the panels.
 */
export const FormJumpBar = ({ panels }: FormJumpBarProps) => {
  const { t } = useTranslate();
  const [activeId, setActiveId] = useState<string | null>(panels[0]?.id ?? null);
  const signature = panels.map(panel => panel.id).join(',');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const elements = signature
      .split(',')
      .map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = elements.find(element => visible.get(element.id));
        if (first) setActiveId(first.id);
      },
      // A panel counts as "in view" while it crosses a band just below the sticky bars.
      { rootMargin: '-20% 0px -60% 0px' }
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [signature]);

  // Narrow screens: the pill scrolls sideways instead of wrapping its labels.
  return (
    <nav
      aria-label={t('Form sections')}
      className="sticky top-[calc(var(--nav-h)+4rem)] z-(--layer-sticky) max-w-full self-start md:top-[calc(var(--nav-h)+4rem)] lg:top-[calc(var(--nav-h)+0.5rem)]"
    >
      <ul className="glass-bar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 [scrollbar-width:none] shadow-[var(--surface-shadow)]">
        {panels.map(panel => (
          <li key={panel.id}>
            <a
              href={`#${panel.id}`}
              onClick={event => {
                const target = document.getElementById(panel.id);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(panel.id);
              }}
              aria-current={activeId === panel.id ? 'location' : undefined}
              className={cn(
                'block rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-tint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                activeId === panel.id && 'bg-segment-active font-semibold text-foreground'
              )}
            >
              {t(panel.label)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
