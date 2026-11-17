/**
 * After a refused submit: opens the first translatable text over its limit inside `container` (the form or the
 * dialog that was submitted, so a second form on the page is never touched) and focuses its editor. Returns whether
 * one was found. The tab switch is form-wide, so the focus follows on the next frame, once the editor shows that text.
 */
export const focusFirstOverLimitTranslation = (container: ParentNode | null | undefined): boolean => {
  const tab = container?.querySelector<HTMLElement>('[data-translatable-field] [role="tab"][data-over-limit]');
  if (!tab) return false;
  const field = tab.closest<HTMLElement>('[data-translatable-field]');
  if (tab.getAttribute('aria-selected') !== 'true') tab.click();
  const focusEditor = () => {
    const editor = field?.querySelector<HTMLElement>(
      'textarea, input:not([type="hidden"]):not([type="checkbox"]), [contenteditable="true"]'
    );
    editor?.focus();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focusEditor);
  else focusEditor();
  return true;
};
