'use client';

import type { PropertyTranslations } from '@mgamadeus/ddd-web/contract';
import type { ReactNode } from 'react';
import { type Control, type FieldValues, type Path, useController, useFormContext } from 'react-hook-form';

import type { FormCondition } from '../logic/pure/conditions.ts';
import { useDisabledWhen, useRequiredWhen, useVisibleWhen } from '../logic/react/conditionHooks.ts';
import { useRegisterFieldLabel } from '../form/fieldLabels.ts';
import { TranslatableInput, type TranslatableInputProps } from './TranslatableInput.tsx';
import { TranslatableMarkdown, type TranslatableMarkdownProps } from './TranslatableMarkdown.tsx';
import type { TranslationTabs } from '../logic/react/useEntityTranslations.ts';

/** @deprecated moved to logic/pure/schemas — the re-export is removed in a later minor */
export { propertyTranslationsSchema } from '../logic/pure/schemas.ts';

const asPropertyTranslations = (value: unknown): PropertyTranslations => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: PropertyTranslations = {};
  for (const [key, text] of Object.entries(value)) if (typeof text === 'string') out[key] = text;
  return out;
};

/** Props the bound translatable fields add to the presentational ones. */
interface BoundTranslatableProps<T extends FieldValues> {
  /** Path of the field's map inside the form's `translations` value: `translations.description`. */
  name: Path<T>;
  control?: Control<T>;
  /** Tabs of the form, from `useEntityTranslations()` (shared by every translatable field of the form). */
  tabs: TranslationTabs;
  visibleWhen?: FormCondition<T>;
  requiredWhen?: FormCondition<T>;
  disabledWhen?: FormCondition<T>;
}

type ControlledKeys = 'value' | 'onChange' | 'locales' | 'activeLocale' | 'onActiveLocaleChange' | 'error';

interface BoundRenderArgs {
  value: PropertyTranslations;
  onChange: (value: PropertyTranslations) => void;
  error?: string;
  required: boolean;
  disabled: boolean;
}

interface BoundTranslatableFrameProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  /** The field's label, registered for `FormErrors`. */
  label?: ReactNode;
  required: boolean;
  disabled: boolean;
  render: (args: BoundRenderArgs) => ReactNode;
}

/** Mounted only while visible: the controller of a hidden field is gone, its value stays in the form. */
const BoundTranslatableFrame = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  disabled,
  render,
}: BoundTranslatableFrameProps<T>) => {
  const { field, fieldState } = useController({ name, control });
  useRegisterFieldLabel(name, label);
  return render({
    value: asPropertyTranslations(field.value),
    onChange: field.onChange,
    error: fieldState.error?.message,
    required,
    disabled,
  });
};

const useBoundState = <T extends FieldValues>({
  control,
  visibleWhen,
  requiredWhen,
  disabledWhen,
}: Pick<BoundTranslatableProps<T>, 'control' | 'visibleWhen' | 'requiredWhen' | 'disabledWhen'>) => {
  const form = useFormContext<T>();
  return {
    control: control ?? form.control,
    isVisible: useVisibleWhen(visibleWhen),
    isRequired: useRequiredWhen(requiredWhen),
    isDisabled: useDisabledWhen(disabledWhen),
  };
};

export type FormTranslatableInputProps<T extends FieldValues> = Omit<TranslatableInputProps, ControlledKeys> &
  BoundTranslatableProps<T>;

/**
 * `TranslatableInput` bound to the surrounding `<Form>`: the value is the field's `{ 'locale::style': text }` map at
 * `name`, the tabs come from `useEntityTranslations`, the message from the schema (e.g. `requiredWhen` on the
 * default locale).
 */
export const FormTranslatableInput = <T extends FieldValues>({
  name,
  control,
  tabs,
  visibleWhen,
  requiredWhen,
  disabledWhen,
  required = false,
  disabled = false,
  ...inputProps
}: FormTranslatableInputProps<T>) => {
  const state = useBoundState({ control, visibleWhen, requiredWhen, disabledWhen });
  if (!state.isVisible) return null;
  return (
    <BoundTranslatableFrame
      name={name}
      control={state.control}
      label={inputProps.label}
      required={state.isRequired || required}
      disabled={state.isDisabled || disabled}
      render={args => (
        <TranslatableInput
          {...inputProps}
          {...args}
          locales={tabs.locales}
          activeLocale={tabs.activeLocale}
          onActiveLocaleChange={tabs.setActiveLocale}
        />
      )}
    />
  );
};

export type FormTranslatableMarkdownProps<T extends FieldValues> = Omit<TranslatableMarkdownProps, ControlledKeys> &
  BoundTranslatableProps<T>;

/** `TranslatableMarkdown` bound to the surrounding `<Form>` (same rules as `FormTranslatableInput`). */
export const FormTranslatableMarkdown = <T extends FieldValues>({
  name,
  control,
  tabs,
  visibleWhen,
  requiredWhen,
  disabledWhen,
  required = false,
  disabled = false,
  ...markdownProps
}: FormTranslatableMarkdownProps<T>) => {
  const state = useBoundState({ control, visibleWhen, requiredWhen, disabledWhen });
  if (!state.isVisible) return null;
  return (
    <BoundTranslatableFrame
      name={name}
      control={state.control}
      label={markdownProps.label}
      required={state.isRequired || required}
      disabled={state.isDisabled || disabled}
      render={args => (
        <TranslatableMarkdown
          {...markdownProps}
          {...args}
          locales={tabs.locales}
          activeLocale={tabs.activeLocale}
          onActiveLocaleChange={tabs.setActiveLocale}
        />
      )}
    />
  );
};
