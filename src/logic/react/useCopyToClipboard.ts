'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CopyToClipboard {
  /** Writes the text; resolves `true` on success, `false` when the browser refused (no permission, insecure origin). */
  copy: (text: string) => Promise<boolean>;
  /** True for `resetMs` after a successful copy (swap the icon to a check). */
  copied: boolean;
}

/** Clipboard write with a short "copied" state, shared by `IdCell`, `EntityMetadata` and the app's copy buttons. */
export const useCopyToClipboard = (resetMs = 1500): CopyToClipboard => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) return false;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs]
  );

  return { copy, copied };
};
