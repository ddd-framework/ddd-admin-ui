'use client';

import { useLayoutEffect } from 'react';

/**
 * Content portalled out of its `<form>` (a drawer's footer, a header slot) keeps submitting it: every submit button in
 * `content` without its own `form` attribute is linked to `form` (an id is given to a form without one), also buttons
 * that mount later.
 */
export const useLinkedSubmitButtons = (
  content: HTMLElement | null,
  form: HTMLFormElement | null,
  fallbackFormId: string
) => {
  useLayoutEffect(() => {
    const element = content;
    if (!form || !element) return;
    if (!form.id) form.id = fallbackFormId;

    const linkSubmitButtons = () => {
      for (const button of element.querySelectorAll('button')) {
        if (button.type === 'submit' && !button.hasAttribute('form')) button.setAttribute('form', form.id);
      }
    };
    linkSubmitButtons();
    const observer = new MutationObserver(linkSubmitButtons);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [content, form, fallbackFormId]);
};
