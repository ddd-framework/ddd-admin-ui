'use client';

import { type ReactNode, useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DrawerFooterSlotContext } from './drawerSlots.ts';

export interface DrawerFooterProps {
  children: ReactNode;
  /** Classes for the content once it sits in the drawer's pinned footer. */
  className?: string;
  /** Classes for the content where it is written, when there is no drawer footer to move into. */
  inlineClassName?: string;
  /** Extra attributes for the inline wrapper (a `data-*` hook for layout CSS). */
  inlineProps?: Record<`data-${string}`, string>;
}

interface FooterTarget {
  footerElement: HTMLElement;
  formElement: HTMLFormElement | null;
}

/**
 * Pins its content (a form's Save and Cancel) to the bottom of the `FormDrawer` it is rendered in; outside a drawer (a page, a dialog opened from the drawer) it renders where it is written.
 *
 * The portalled footer sits outside the `<form>` in the DOM, so every submit button in it is linked back to its form
 * with the `form` attribute: Save, and Enter in a field, still submit the form.
 */
export const DrawerFooter = ({ children, className, inlineClassName, inlineProps }: DrawerFooterProps) => {
  const slot = useContext(DrawerFooterSlotContext);
  const fallbackFormId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FooterTarget | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    // A dialog opened from inside the drawer still sees the drawer's context, but its DOM is portalled to <body>.
    if (!slot || !anchor || !slot.bodyElement.contains(anchor)) {
      setTarget(null);
      return;
    }
    setTarget({ footerElement: slot.footerElement, formElement: anchor.closest('form') });
  }, [slot]);

  const formElement = target?.formElement ?? null;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!formElement || !content) return;
    if (!formElement.id) formElement.id = fallbackFormId;

    const linkSubmitButtons = () => {
      for (const button of content.querySelectorAll('button')) {
        if (button.type === 'submit' && !button.hasAttribute('form')) button.setAttribute('form', formElement.id);
      }
    };
    linkSubmitButtons();
    const observer = new MutationObserver(linkSubmitButtons);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [formElement, fallbackFormId]);

  return (
    <>
      <span ref={anchorRef} hidden />
      {target ? (
        createPortal(
          <div ref={contentRef} className={className}>
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
