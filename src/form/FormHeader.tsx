import type { ReactNode } from 'react';

import { DetailHeader } from '../page/DetailHeader.tsx';

export interface FormHeaderProps {
  /** The form title; a two-tone title wraps its brand part in `<em>`. */
  title: ReactNode;
  description?: ReactNode;
  /** The back link (ghost icon button), in the header's left column. */
  leading?: ReactNode;
  /** Right-aligned actions. */
  actions?: ReactNode;
  /** A form inside another entity's detail shell (a track of an account): `h2` title, the shell keeps the `h1`. */
  nested?: boolean;
  /**
   * The form's `FormActions` move into this header (a `FormActionsSlot` after `actions`). Wrap the header and the form
   * in one `FormActionsSlotProvider` (`./primitives`).
   */
  formActionsSlot?: boolean;
  className?: string;
}

/**
 * Title row of a form page in the detail-header layout: back left, the title centred, actions
 * right — the same header as the entity's detail page (`EntityDetailShell`). A `FormDrawer` brings its own header; a
 * form inside another entity's detail shell passes `nested` (an `h2`, never a second page title).
 */
export const FormHeader = ({ title, description, leading, actions, nested, formActionsSlot, className }: FormHeaderProps) => (
  <DetailHeader
    back={leading}
    title={title}
    description={description}
    aside={actions}
    nested={nested}
    formActionsSlot={formActionsSlot}
    className={className}
  />
);
