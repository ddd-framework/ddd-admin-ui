import type { ReactNode } from 'react';

import { formatUiNumber } from '../i18n/format.ts';
import { m } from '../i18n/store.ts';
import type { StatusMap } from '../logic/pure/status.ts';
import { BooleanCell, DateCell, IdCell, ImageCell, type ImageCellProps } from './cells.tsx';
import { orEmpty } from './EmptyValue.tsx';
import type { EntityListColumn } from './EntityListTable.tsx';
import { ActionsHeaderText } from './ActionsHeaderText.tsx';
import { StatusBadge } from './StatusBadge.tsx';

const ACTIONS_LABEL = m('Actions', { context: 'table-column' });

/**
 * Column factories: each returns an ordinary `EntityListColumn`, so a list mixes them with hand-written columns and
 * can still override any field. The display id (`id`), the API sort key (`sortKey`) and the filter content (`filter`)
 * are separate inputs; nothing is derived from another. Every factory is its own export, so a bundler drops the ones a
 * host does not import.
 */
export interface ColumnFactoryOptions<TItem> {
  /** Stable column id (React key, the host's column settings); not a sort key. */
  id: string;
  /** English UI text (translated by the table) or a node. */
  header: ReactNode;
  /** The request's sort name of this column; the header becomes a sort control with the table's `onSortChange`. */
  sortKey?: string;
  sortStart?: EntityListColumn<TItem>['sortStart'];
  width?: EntityListColumn<TItem>['width'];
  minWidth?: number;
  pin?: EntityListColumn<TItem>['pin'];
  align?: EntityListColumn<TItem>['align'];
  className?: string;
  filter?: ReactNode;
}

const base = <TItem,>(options: ColumnFactoryOptions<TItem>): Omit<EntityListColumn<TItem>, 'cell'> => ({
  id: options.id,
  header: options.header,
  sortKey: options.sortKey,
  sortStart: options.sortStart,
  width: options.width,
  minWidth: options.minWidth,
  pin: options.pin,
  align: options.align,
  className: options.className,
  filter: options.filter,
});

/** Plain text (a name, a code); `—` when empty. */
export const textColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & { value: (item: TItem) => ReactNode }
): EntityListColumn<TItem> => ({ ...base(options), cell: item => orEmpty(options.value(item)) });

/**
 * A number, end-aligned in tabular figures: `format` is the `Intl.NumberFormatOptions` (in the UI language) or the
 * host's own formatter (`(value) => string`), always explicit at the column. `—` for `null` / `undefined`.
 */
export const numberColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & {
    value: (item: TItem) => number | null | undefined;
    format?: Intl.NumberFormatOptions | ((value: number) => string);
  }
): EntityListColumn<TItem> => ({
  ...base({ align: 'end', ...options }),
  cell: item => {
    const value = options.value(item);
    if (value === null || value === undefined || Number.isNaN(value)) return orEmpty(null);
    const text = typeof options.format === 'function' ? options.format(value) : formatUiNumber(value, options.format);
    return <span className="tabular-nums">{text}</span>;
  },
});

/**
 * An amount of money: the currency is required (ISO 4217, or per row), never a locale default. `format` adds
 * `Intl.NumberFormatOptions` (e.g. `{ maximumFractionDigits: 0 }`) or replaces the formatter (`(value, currency) =>`).
 */
export const moneyColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & {
    value: (item: TItem) => number | null | undefined;
    currency: string | ((item: TItem) => string | null | undefined);
    format?: Intl.NumberFormatOptions | ((value: number, currency: string) => string);
  }
): EntityListColumn<TItem> => ({
  ...base({ align: 'end', ...options }),
  cell: item => {
    const value = options.value(item);
    const currency = typeof options.currency === 'function' ? options.currency(item) : options.currency;
    if (value === null || value === undefined || Number.isNaN(value) || !currency) return orEmpty(null);
    const text =
      typeof options.format === 'function'
        ? options.format(value, currency)
        : formatUiNumber(value, { ...options.format, style: 'currency', currency });
    return <span className="tabular-nums">{text}</span>;
  },
});

/** A backend date-time or date through `DateCell` (relative time on hover). */
export const dateColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & {
    value: (item: TItem) => string | null | undefined;
    format?: 'dateTime' | 'date';
    locale?: string;
  }
): EntityListColumn<TItem> => ({
  ...base(options),
  cell: item => <DateCell value={options.value(item)} format={options.format} locale={options.locale} />,
});

/** A flag through `BooleanCell`. */
export const booleanColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & {
    value: (item: TItem) => boolean | null | undefined;
    trueLabel?: string;
    falseLabel?: string;
    showFalse?: boolean;
  }
): EntityListColumn<TItem> => ({
  ...base(options),
  cell: item => (
    <BooleanCell value={options.value(item)} trueLabel={options.trueLabel} falseLabel={options.falseLabel} showFalse={options.showFalse} />
  ),
});

/** A thumbnail through `ImageCell`; `src` is a resolved URL (the host sizes media URLs). */
export const imageColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & {
    src: (item: TItem) => string | null | undefined;
    /** Alternative text per row; `''` for a decorative thumbnail next to the name. */
    alt?: (item: TItem) => string;
  } & Pick<ImageCellProps, 'size' | 'fit' | 'bordered' | 'objectFit'>
): EntityListColumn<TItem> => ({
  ...base(options),
  cell: item => (
    <ImageCell
      src={options.src(item)}
      alt={options.alt?.(item) ?? ''}
      size={options.size}
      fit={options.fit}
      bordered={options.bordered}
      objectFit={options.objectFit}
    />
  ),
});

/** The ID column through `IdCell`. */
export const idColumn = <TItem,>(
  options: ColumnFactoryOptions<TItem> & { value: (item: TItem) => number | string | null | undefined; copyable?: boolean }
): EntityListColumn<TItem> => ({
  ...base(options),
  cell: item => <IdCell id={options.value(item)} copyable={options.copyable} />,
});

/** An enum through `StatusBadge` and the host's status map. */
export const statusColumn = <TItem, TValue extends string = string>(
  options: ColumnFactoryOptions<TItem> & { value: (item: TItem) => TValue | null | undefined; map: StatusMap<TValue> }
): EntityListColumn<TItem> => ({
  ...base(options),
  cell: item => <StatusBadge value={options.value(item)} map={options.map} />,
});

/**
 * The row's actions, last: as wide as its buttons (`width: 'content'`), pinned to the end and end-aligned by default;
 * the header is a screen-reader label (English UI text, default "Actions").
 */
export const actionsColumn = <TItem,>(
  options: Omit<ColumnFactoryOptions<TItem>, 'id' | 'header'> & {
    id?: string;
    label?: string;
    cell: (item: TItem) => ReactNode;
  }
): EntityListColumn<TItem> => ({
  ...base({ width: 'content', pin: 'end', align: 'end', ...options, id: options.id ?? 'actions', header: null }),
  header: <ActionsHeaderText label={options.label ?? ACTIONS_LABEL} />,
  cell: options.cell,
});
