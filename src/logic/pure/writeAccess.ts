/**
 * Whether the screen may write, as a presentation aid: write controls of the blocks (`FormSubmitButton`, the actions of
 * `EntityListBulkBar`, `AddEntityButton` as a button) are disabled while it is `false`. It replaces no handler guard and
 * no server check.
 */
export interface WriteAccess {
  allowed: boolean;
  /** Why writes are off (shown as the disabled control's title). */
  reason?: string;
}

/** No provider: writes allowed. */
export const WRITE_ACCESS_ALLOWED: WriteAccess = Object.freeze({ allowed: true });

/**
 * The access of a nested provider: a subtree can only narrow. An outer `allowed: false` stays, with its reason; an
 * inner `allowed: false` below an allowed parent applies with the inner reason.
 */
export const narrowWriteAccess = (parent: WriteAccess, own: WriteAccess): WriteAccess => {
  if (!parent.allowed) return parent;
  if (own.allowed) return parent === WRITE_ACCESS_ALLOWED && own.reason === undefined ? WRITE_ACCESS_ALLOWED : { allowed: true };
  return own.reason === undefined ? { allowed: false } : { allowed: false, reason: own.reason };
};
