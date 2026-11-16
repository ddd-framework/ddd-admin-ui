/** Uploads a file and answers the stored item's URL. Provided by the host (provider prop or per field). */
export type MediaUploadAdapter = (file: File, options: { signal: AbortSignal }) => Promise<{ url: string }>;
