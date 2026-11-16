/**
 * Every descendant that owns its own click. One `closest()` test on a list row or card replaces per-control
 * `stopPropagation` calls. `[data-row-action-ignore]` is the escape hatch for a non-semantic clickable.
 */
export const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], [role="checkbox"], [role="switch"], ' +
  '[role="menuitem"], [role="link"], [role="tab"], [data-row-action-ignore]';
