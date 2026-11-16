import { m } from '../i18n/store.ts';

export interface FilterOption {
  value: string;
  label: string;
}

/** The old boolean filter options (`''` all, `'1'` yes, `'0'` no) for a `FilterSelect`. */
export const YES_NO_FILTER_OPTIONS: readonly FilterOption[] = [
  { value: '1', label: m('Yes') },
  { value: '0', label: m('No') },
];
