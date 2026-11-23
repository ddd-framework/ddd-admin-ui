'use client';

import { useEffect, useRef, useState } from 'react';

import { FILE_CHECK_POLL_INTERVAL_MS } from './fileView.ts';

export interface FileCheckPollingOptions {
  /** The drawer shows a file (closed: no polling, no reports). */
  isOpen: boolean;
  /** A version of the shown file is being uploaded or checked (`isFileBeingChecked()`). */
  isChecking: boolean;
  /** Fetches the file again (the adapter's `refetch`), on window focus while checking. */
  refetch?: () => void;
  /** Called once when a check the drawer watched has finished (the list row shows the final state too). */
  onCheckFinished?: () => void;
}

const isDocumentVisible = (): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/**
 * The polling interval for the open file while one of its versions is being checked: `FILE_CHECK_POLL_INTERVAL_MS`
 * while checking and the tab is visible, else 0 (a hidden tab does not poll). Fetches again on window focus while
 * checking and reports the end of a watched check once.
 */
export const useFileCheckPolling = ({ isOpen, isChecking: isFileChecking, refetch, onCheckFinished }: FileCheckPollingOptions): number => {
  const isChecking = isOpen && isFileChecking;
  const [isVisible, setIsVisible] = useState(isDocumentVisible);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const onCheckFinishedRef = useRef(onCheckFinished);
  onCheckFinishedRef.current = onCheckFinished;
  const wasCheckingRef = useRef(false);

  useEffect(() => {
    const onVisibilityChange = () => setIsVisible(isDocumentVisible());
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isChecking) return undefined;
    const onFocus = () => refetchRef.current?.();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isChecking]);

  useEffect(() => {
    // a check that finished while the drawer was open; closing the drawer ends the watch without a report
    if (isOpen && wasCheckingRef.current && !isFileChecking) onCheckFinishedRef.current?.();
    wasCheckingRef.current = isOpen && isFileChecking;
  }, [isOpen, isFileChecking]);

  return isChecking && isVisible ? FILE_CHECK_POLL_INTERVAL_MS : 0;
};
