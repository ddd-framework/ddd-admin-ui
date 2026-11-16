'use client';

import type { ReactNode } from 'react';
import { useFormState } from 'react-hook-form';

import { Button } from '../primitives/index.ts';

export interface FormSubmitButtonProps {
  children: ReactNode;
  /** Label while the submit handler runs (`formState.isSubmitting`, i.e. the awaited save). */
  pendingLabel?: ReactNode;
  /** The write guard and any other blocker (`!writesAllowed || isTranslating`); pending disables it too. */
  disabled?: boolean;
  /** Extra pending source outside the submit handler (a mutation still loading). */
  isPending?: boolean;
  className?: string;
}

/**
 * The form's primary button: `type="submit"`, disabled and relabelled while the submit is pending. Label standard:
 * `Save` / `Saving…` on edit, `Create <Entity>` / `Creating <Entity>…` on create.
 */
export const FormSubmitButton = ({
  children,
  pendingLabel,
  disabled = false,
  isPending = false,
  className,
}: FormSubmitButtonProps) => {
  const { isSubmitting } = useFormState();
  const pending = isSubmitting || isPending;
  return (
    <Button type="submit" disabled={disabled || pending} className={className}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
};
