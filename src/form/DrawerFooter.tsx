'use client';

import { type ReactNode, type Ref, useCallback, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DrawerFooterSlotContext } from './drawerSlots.ts';
import { useLinkedSubmitButtons } from './linkSubmitButtons.ts';

export interface DrawerFooterProps {
  children: ReactNode;
  /** Classes for the content once it sits in the drawer's pinned footer. */
  className?: string;
  /** Classes for the content where it is written, when there is no drawer footer to move into. */
  inlineClassName?: string;
  /** Extra attributes for the inline wrapper (a `data-*` hook for layout CSS). */
  inlineProps?: Record<`data-${string}`, string>;
}

export interface DrawerFooterViewProps extends DrawerFooterProps {
  /** The hidden anchor where the footer is written (inside the form); kept across every placement. */
  anchorRef?: Ref<HTMLSpanElement>;
  /** Outside a drawer: portal the content into this element (a header slot) instead of rendering it inline. */
  portalInto?: HTMLElement | null;
}

interface FooterTarget {
  footerElement: HTMLElement;
  formElement: HTMLFormElement | null;
}

/** `DrawerFooter` with the anchor and a second portal target, for `FormActions`. */
export const DrawerFooterView = ({
  children,
  className,
  inlineClassName,
  inlineProps,
  anchorRef: externalAnchorRef,
  portalInto,
}: DrawerFooterViewProps) => {
  const slot = useContext(DrawerFooterSlotContext);
  const fallbackFormId = useId();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<FooterTarget | null>(null);

  const setAnchor = useCallback(
    (element: HTMLSpanElement | null) => {
      anchorRef.current = element;
      if (typeof externalAnchorRef === 'function') externalAnchorRef(element);
      else if (externalAnchorRef) externalAnchorRef.current = element;
    },
    [externalAnchorRef]
  );

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      setTarget(null);
      return;
    }
    // A dialog opened from inside the drawer still sees the drawer's context, but its DOM is portalled to <body>.
    if (slot && slot.bodyElement.contains(anchor)) {
      setTarget({ footerElement: slot.footerElement, formElement: anchor.closest('form') });
    } else if (portalInto) {
      setTarget({ footerElement: portalInto, formElement: anchor.closest('form') });
    } else {
      setTarget(null);
    }
  }, [slot, portalInto]);

  useLinkedSubmitButtons(content, target?.formElement ?? null, fallbackFormId);

  return (
    <>
      <span ref={setAnchor} hidden />
      {target ? (
        createPortal(
          <div ref={setContent} className={className}>
            {children}
          </div>,
          target.footerElement
        )
      ) : (
        <div className={inlineClassName} {...inlineProps}>
          {children}
        </div>
      )}
    </>
  );
};

/**
 * Pins its content (a form's Save and Cancel) to the bottom of the `FormDrawer` it is rendered in; outside a drawer (a page, a dialog opened from the drawer) it renders where it is written.
 *
 * The portalled footer sits outside the `<form>` in the DOM, so every submit button in it is linked back to its form
 * with the `form` attribute: Save, and Enter in a field, still submit the form.
 */
export const DrawerFooter = ({ children, className, inlineClassName, inlineProps }: DrawerFooterProps) => (
  <DrawerFooterView className={className} inlineClassName={inlineClassName} inlineProps={inlineProps}>
    {children}
  </DrawerFooterView>
);
