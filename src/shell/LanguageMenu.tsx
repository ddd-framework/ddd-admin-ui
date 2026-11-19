'use client';

import { Check, Languages, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu.tsx';

/** One language of the menu. */
export interface LanguageOption {
  /** What `onChange` receives (`de`, `pt-BR`); also the `lang` of the native name. */
  code: string;
  /** The name in the language itself (`Deutsch`): data, never translated. */
  nativeName: string;
  /** A second line for readers of the current UI language (`German`), shown when it differs. */
  englishName?: string;
}

export interface LanguageMenuProps {
  languages: readonly LanguageOption[];
  /** The code of the current language (checked in the list, shown on the trigger). */
  current: string;
  onChange: (code: string) => void;
  /** A change is being saved: the choices are disabled, the trigger shows a spinner. */
  isPending?: boolean;
  /** Under the choices (e.g. "Applies to this tab only"). */
  note?: ReactNode;
  /** More menu content after the languages (a writing-style choice). */
  children?: ReactNode;
  /** With one language or none the menu renders nothing (default `true`). */
  hideWhenSingle?: boolean;
  className?: string;
  /**
   * The trigger's accessible name, already translated, instead of "Language: <name>" (e.g. one that also names the
   * writing style chosen in `children`: "Language: Deutsch, informal").
   */
  triggerAriaLabel?: string;
  /** The submenu trigger's text (`LanguageMenuSub`), already translated, instead of "Language: <name>". */
  triggerLabel?: string;
  /** The trigger's icon instead of the languages icon (`false`: none); also the submenu trigger's. */
  icon?: ReactNode | false;
  /** `sm` (default): the trigger's icon shows from 640 px (the code alone below); `always`: at every width. */
  iconVisibility?: 'sm' | 'always';
  /** Classes of the menu's content (its width: default `w-64`; the submenu's `w-60`). */
  contentClassName?: string;
  /** The heading over the choices: default "Language"; a node replaces it; `false` drops it. */
  heading?: ReactNode | false;
  /** The content of one choice instead of the native name and the English name (the check stays). */
  renderOption?: (language: LanguageOption, checked: boolean) => ReactNode;
  /** Extra classes of every language row (a menu item). */
  optionClassName?: string;
  /** Extra classes of the check mark (shown on the current language, hidden on the others). */
  checkClassName?: string;
  /** `onChange` also runs for the current language (a host that re-applies or re-saves it). Default `false`. */
  allowReselect?: boolean;
}

const PILL_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground uppercase tabular-nums transition-colors outline-none hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

/** The language rows (menu items with a radio role and a check on the current one). */
export const LanguageMenuItems = ({
  languages,
  current,
  onChange,
  isPending,
  renderOption,
  optionClassName,
  checkClassName,
  allowReselect = false,
}: Pick<
  LanguageMenuProps,
  'languages' | 'current' | 'onChange' | 'isPending' | 'renderOption' | 'optionClassName' | 'checkClassName' | 'allowReselect'
>) => (
  <>
    {languages.map(language => {
      const checked = language.code === current;
      return (
        <DropdownMenuItem
          key={language.code}
          role="menuitemradio"
          aria-checked={checked}
          disabled={isPending}
          onSelect={() => {
            if (!checked || allowReselect) onChange(language.code);
          }}
          className={optionClassName ? cn('justify-between gap-3', optionClassName) : 'justify-between gap-3'}
        >
          {renderOption ? (
            renderOption(language, checked)
          ) : (
            <span className="min-w-0 truncate">
              <span lang={language.code}>{language.nativeName}</span>
              {language.englishName && language.englishName !== language.nativeName && (
                <span className="ms-1.5 text-xs text-muted-foreground">{language.englishName}</span>
              )}
            </span>
          )}
          <Check aria-hidden className={cn('size-4', checked ? 'opacity-100' : 'opacity-0', checkClassName)} />
        </DropdownMenuItem>
      );
    })}
  </>
);

const currentName = (languages: readonly LanguageOption[], current: string): string =>
  languages.find(language => language.code === current)?.nativeName ?? current;

/**
 * The language choice of the top bar, fed by the host: a compact pill with the current code; its menu lists the
 * languages by their native names (each in its own `lang`), the current one checked (`menuitemradio`). `onChange` gets
 * the code; the host applies and saves it. Nothing with fewer than two languages (unless `hideWhenSingle={false}`).
 */
export const LanguageMenu = ({
  languages,
  current,
  onChange,
  isPending,
  note,
  children,
  hideWhenSingle = true,
  className,
  triggerAriaLabel,
  icon,
  iconVisibility = 'sm',
  contentClassName,
  heading,
  renderOption,
  optionClassName,
  checkClassName,
  allowReselect,
}: LanguageMenuProps) => {
  const { t } = useTranslate();
  if (hideWhenSingle && languages.length < 2 && !children) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={triggerAriaLabel ?? t('Language: %language%', { replacements: { language: currentName(languages, current) } })}
        data-shell-language-menu=""
        className={cn(PILL_CLASS, className)}
      >
        {isPending ? (
          <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
        ) : icon === false ? null : icon !== undefined ? (
          <span aria-hidden className={cn('shrink-0 text-muted-foreground', iconVisibility === 'sm' && 'hidden sm:inline-flex')}>
            {icon}
          </span>
        ) : (
          <Languages aria-hidden className={iconVisibility === 'always' ? 'size-4 text-muted-foreground' : 'hidden size-4 text-muted-foreground sm:block'} />
        )}
        <span translate="no">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={
          contentClassName
            ? cn('max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-64 overflow-y-auto', contentClassName)
            : 'max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-64 overflow-y-auto'
        }
      >
        {heading !== false && <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{heading ?? t('Language')}</DropdownMenuLabel>}
        <LanguageMenuItems
          languages={languages}
          current={current}
          onChange={onChange}
          isPending={isPending}
          renderOption={renderOption}
          optionClassName={optionClassName}
          checkClassName={checkClassName}
          allowReselect={allowReselect}
        />
        {children}
        {note && <div className="max-w-60 px-2 py-1.5 text-xs text-muted-foreground">{note}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** The same choice as a submenu ("Language: Deutsch"), for the account menu. */
export const LanguageMenuSub = ({
  languages,
  current,
  onChange,
  isPending,
  note,
  triggerLabel,
  icon,
  contentClassName,
  heading,
  renderOption,
  optionClassName,
  checkClassName,
  allowReselect,
}: Omit<LanguageMenuProps, 'children' | 'hideWhenSingle' | 'className' | 'triggerAriaLabel' | 'iconVisibility'>) => {
  const { t } = useTranslate();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {icon === undefined ? <Languages aria-hidden /> : icon === false ? null : icon}
        <span className="min-w-0 flex-1 truncate">
          {triggerLabel ?? t('Language: %language%', { replacements: { language: currentName(languages, current) } })}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className={
          contentClassName
            ? cn('max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-60 overflow-y-auto', contentClassName)
            : 'max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-60 overflow-y-auto'
        }
      >
        {heading !== undefined && heading !== false && (
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{heading}</DropdownMenuLabel>
        )}
        <LanguageMenuItems
          languages={languages}
          current={current}
          onChange={onChange}
          isPending={isPending}
          renderOption={renderOption}
          optionClassName={optionClassName}
          checkClassName={checkClassName}
          allowReselect={allowReselect}
        />
        {note && <div className="max-w-60 px-2 py-1.5 text-xs text-muted-foreground">{note}</div>}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
