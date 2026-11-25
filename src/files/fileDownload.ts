/** Opens a download URL (the server answers with `Content-Disposition: attachment`). */
export const startFileDownload = (url: string, fileName: string): void => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
