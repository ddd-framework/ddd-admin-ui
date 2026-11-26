/**
 * What an element declares for an agent that acts on the screen (`actOnScreen` of `Agent.UI`, `@mgamadeus/ddd-agents`):
 * the agent's client acts only on an element with `data-agent-action`, found by a reference of its screen read, never
 * by a selector. The package's blocks declare their own elements (a table's sort controls, rows and cards with an
 * action, the tabs of `EntityTabs`, the filter toggle and "Clear filters"); a host declares its own buttons with
 * {@link agentPressProps}. Pure: the attributes only, no agents package.
 */

/** `sort`: a column's sort control · `open`: a row or card that opens its record · `tab`: a tab · `press`: a button. */
export type AgentActionKind = 'sort' | 'open' | 'tab' | 'press';

/**
 * What pressing a declared button does: `view` changes what the screen shows and nothing stored (open a panel or a
 * dialog, load more rows, switch a view, clear the filters); `write` saves, deletes, sends or starts something. The
 * agent's client presses only `view`; a `write` declaration lets it say why it refuses.
 */
export type AgentActionEffect = 'view' | 'write';

export const AGENT_ACTION_ATTRIBUTE = 'data-agent-action';

export const AGENT_ACTION_KEY_ATTRIBUTE = 'data-agent-action-key';

export const AGENT_ACTION_EFFECT_ATTRIBUTE = 'data-agent-action-effect';

/** A key the agent's reference carries (`col.<key>`, `t.<key>`, `act.<key>`): letters, digits, `.`, `-`, `_`. */
export const AGENT_ACTION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/;

export interface AgentActionProps {
  'data-agent-action': AgentActionKind;
  'data-agent-action-key'?: string;
  'data-agent-action-effect'?: AgentActionEffect;
}

/** The declaration of a sort control (key: the column's `sortKey`), a tab (key: its id) or a row that opens (no key: its `data-row-key`). */
export const agentActionProps = (kind: Exclude<AgentActionKind, 'press'>, key?: string): AgentActionProps =>
  key !== undefined && AGENT_ACTION_KEY_PATTERN.test(key) ? { 'data-agent-action': kind, 'data-agent-action-key': key } : { 'data-agent-action': kind };

/**
 * The declaration of a button a host offers to the agent: spread it on the button. The effect defaults to `write`,
 * which the agent never presses; pass `'view'` only for a button that changes nothing stored. A key that is no token
 * declares nothing.
 *
 * @example <Button {...agentPressProps('app-preview', 'view')} onClick={openPreview}>App preview</Button>
 */
export const agentPressProps = (key: string, effect: AgentActionEffect = 'write'): AgentActionProps | Record<string, never> =>
  AGENT_ACTION_KEY_PATTERN.test(key) ? { 'data-agent-action': 'press', 'data-agent-action-key': key, 'data-agent-action-effect': effect } : {};
