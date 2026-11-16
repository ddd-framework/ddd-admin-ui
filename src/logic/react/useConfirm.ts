'use client';

import { createContext, useContext } from 'react';

import { confirmWithoutProvider } from '../pure/confirm.ts';
import type { ConfirmFn } from './useUnsavedChangesGuard.ts';

/**
 * The confirmation of the nearest `AdminUiProvider`: the package dialog (calls queue), or the host's own `confirm`
 * passed to the provider. `null` outside a provider.
 */
export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * `confirm(options)` of the nearest `AdminUiProvider`, resolving `true` on confirm and `false` on cancel, Escape or the
 * backdrop; the screen renders nothing. Calls queue and each settles exactly once (an unmounted provider settles its
 * pending calls with `false`). Without a provider every call answers `false` (one warning outside production). The
 * function is stable while the provider is.
 */
export const useConfirm = (): ConfirmFn => useContext(ConfirmContext) ?? confirmWithoutProvider;
