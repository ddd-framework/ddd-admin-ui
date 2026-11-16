/**
 * Shape by role:
 * - things you TYPE INTO or pick in a form (Input, Textarea, Select, Combobox, MultiSelect, colour / markdown frames)
 *   are a 12 px soft rectangle: the card colour with a quiet edge (`--field-edge`, ≈ 2 : 1), the full 3 : 1 edge
 *   (`--field-edge-strong`, WCAG 1.4.11) on hover and while a list is open;
 * - things that sit in a BAR (the search, a toolbar's menu) are a pill in the `--tint` wash, no edge;
 * - buttons take the field's 12 px corner; only a control in a bar keeps the pill (`rounded="full"`);
 * - containers get rounder as they grow (rows 10 px, open lists and cards 16 px, dialogs and sheets 24 px).
 */

/** A form field's surface: card fill, the quiet edge, the strong edge on hover; the error edge without a layout shift. */
export const FIELD_SURFACE_CLASS =
  'border border-field-edge bg-card text-foreground transition-colors hover:border-field-edge-strong aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-field-edge';

/** A form field's corner (12 px). */
export const FIELD_RADIUS_CLASS = 'rounded-xl';

/**
 * A control in a bar (search, a toolbar's menu): the tint pill. The transparent border box keeps an error edge
 * possible without shifting the layout.
 */
export const CONTROL_SURFACE_CLASS =
  'rounded-full border border-transparent bg-tint text-foreground transition-colors hover:border-transparent hover:bg-tint-strong aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent disabled:hover:bg-tint';

/** Keyboard focus: the 2 px cyan ring of every control. */
export const FIELD_FOCUS_CLASS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** For a frame whose focus lands on an input inside it (MultiSelect, the markdown editor). */
export const FIELD_FOCUS_WITHIN_CLASS = 'focus-within:ring-2 focus-within:ring-ring';
