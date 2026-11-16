'use client';

import type { ReactNode } from 'react';
import { useFormState } from 'react-hook-form';

import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { Button } from '../primitives/index.ts';

export interface FormSubmitButtonProps {
  children: ReactNode;
  /** Label while the submit handler runs (`formState.isSubmitting`, i.e. the awaited save). */
  pendingLabel?: ReactNode;
  /** The write guard and any other blocker (`!writesAllowed || isTranslating`); pending disables it too. */
  disabled?: boolean;
  /** Extra pending source outside the submit handler (a mutation still loading). */
  isPending?: boolean;
  /**
   * A submit that only reads (a search, a preview): not disabled by `WriteAccessProvider`. Without it the button is
   * disabled while writes are not allowed, with the reason as its title.
   */
  ignoreWriteAccess?: boolean;
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
  ignoreWriteAccess = false,
  className,
}: FormSubmitButtonProps) => {
  const { isSubmitting } = useFormState();
  const writeAccess = useWriteAccess();
  const pending = isSubmitting || isPending;
  const writeBlocked = !ignoreWriteAccess && !writeAccess.allowed;
  return (
    <Button
      type="submit"
      disabled={disabled || pending || writeBlocked}
      title={writeBlocked ? writeAccess.reason : undefined}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
};
