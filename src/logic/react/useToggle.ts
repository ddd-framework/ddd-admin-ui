'use client';

import { useCallback, useState } from 'react';

export interface UseToggleResult {
  isOn: boolean;
  setOn: (value: boolean) => void;
  toggle: () => void;
}

/** A boolean state with a stable `toggle`. */
export const useToggle = (initial = false): UseToggleResult => {
  const [isOn, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((value) => !value), []);
  return { isOn, setOn, toggle };
};
