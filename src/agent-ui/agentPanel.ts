import type { ScreenOccludingRect } from './contract.ts';

/** The attribute a host puts on its agent window, so a mark is scrolled beside it (the default `findAgentPanel`). */
export const AGENT_PANEL_ATTRIBUTE = 'data-agent-panel';

/** Something with a box in the viewport (an element). */
export interface ViewportBoxSource {
  getBoundingClientRect(): { top: number; left: number; right: number; bottom: number };
}

/**
 * The region the agent window covers in the viewport, or null when there is none to avoid: no window, a window
 * without a box (closed, `display: none`), or a box entirely outside the viewport.
 */
export const findOccludingRectOfAgentPanel = (
  agentPanel: ViewportBoxSource | null,
  viewport: { width: number; height: number },
): ScreenOccludingRect | null => {
  if (agentPanel === null) return null;
  const box = agentPanel.getBoundingClientRect();
  if (box.right <= box.left || box.bottom <= box.top) return null;
  if (box.bottom <= 0 || box.top >= viewport.height || box.right <= 0 || box.left >= viewport.width) return null;
  return { top: box.top, left: box.left, right: box.right, bottom: box.bottom };
};

/** The default lookup of the agent window: the first element carrying {@link AGENT_PANEL_ATTRIBUTE}. */
export const findAgentPanelByAttribute = (): Element | null =>
  typeof document === 'undefined' ? null : document.querySelector(`[${AGENT_PANEL_ATTRIBUTE}]`);
