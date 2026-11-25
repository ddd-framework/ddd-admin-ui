// Loads the optional peers of ./markdown (`@uiw/react-md-editor`, `rehype-sanitize`) once per page, only when a
// markdown block mounts: the dynamic imports keep them out of the module graph of every other entry, out of the
// server render and out of a host bundle that never renders a markdown block. The editor's own stylesheet comes with
// its module (the library imports it).
import type { ComponentType } from 'react';

import {
  extendMarkdownSanitizeSchema,
  type MarkdownSanitizeSchema,
  rehypeOutsideLinks,
  remarkLineBreaks,
  remarkUntrustedContent,
  restrictMarkdownSanitizeSchema,
  untrustedMarkdownUrl,
} from './markdownPipeline.ts';

/** A command of the editor's toolbar (opaque: passed back to the editor as is). */
export type MarkdownToolbarCommand = { readonly name?: string; readonly [key: string]: unknown };

/** The loaded library as the blocks use it (structural, so no declaration names a type of the optional peer). */
export interface MarkdownLibrary {
  // biome-ignore lint/suspicious/noExplicitAny: the editor's props are the peer's type
  Editor: ComponentType<any>;
  // biome-ignore lint/suspicious/noExplicitAny: the preview's props are the peer's type
  Preview: ComponentType<any>;
  toolbars: {
    full: readonly MarkdownToolbarCommand[];
    minimal: readonly MarkdownToolbarCommand[];
    fullExtra: readonly MarkdownToolbarCommand[];
    minimalExtra: readonly MarkdownToolbarCommand[];
  };
  /** Sanitising after the raw HTML is parsed (the preview parses raw HTML first). */
  rehypePlugins: readonly unknown[];
  remarkPlugins: readonly unknown[];
  sanitizeSchema: MarkdownSanitizeSchema;
  /**
   * The pipeline for markdown of unknown origin (`MarkdownPreview untrusted`): raw HTML stays text, pictures become
   * their description, no element that loads a resource survives, links keep `http(s):` / `mailto:` only and open
   * outside.
   */
  untrusted: {
    rehypePlugins: readonly unknown[];
    remarkPlugins: readonly unknown[];
    urlTransform: (url: string) => string;
  };
}

let pending: Promise<MarkdownLibrary> | null = null;

/**
 * Imports the editor and the sanitiser once; a failed load (a missing peer, a chunk that did not arrive) rejects and
 * is tried again on the next call.
 */
export const loadMarkdownLibrary = (): Promise<MarkdownLibrary> => {
  if (!pending) {
    pending = Promise.all([import('@uiw/react-md-editor'), import('rehype-sanitize')]).then(
      ([editorModule, sanitizeModule]) => {
        const editor = editorModule.default;
        const { commands } = editorModule;
        const sanitizeSchema = extendMarkdownSanitizeSchema(sanitizeModule.defaultSchema as MarkdownSanitizeSchema);
        return {
          Editor: editor,
          Preview: editor.Markdown,
          toolbars: {
            full: [
              commands.bold, commands.italic, commands.strikethrough, commands.link, commands.image,
              commands.unorderedListCommand, commands.orderedListCommand, commands.checkedListCommand, commands.code,
              commands.codeBlock, commands.quote, commands.hr, commands.title1, commands.title2, commands.title3,
            ],
            minimal: [
              commands.bold, commands.italic, commands.strikethrough, commands.link, commands.unorderedListCommand,
              commands.orderedListCommand, commands.code,
            ],
            fullExtra: [commands.codeEdit, commands.codeLive, commands.codePreview],
            minimalExtra: [commands.codeEdit, commands.codePreview],
          },
          rehypePlugins: [[sanitizeModule.default, sanitizeSchema]],
          remarkPlugins: [remarkLineBreaks],
          sanitizeSchema,
          untrusted: {
            rehypePlugins: [
              [sanitizeModule.default, restrictMarkdownSanitizeSchema(sanitizeModule.defaultSchema as MarkdownSanitizeSchema)],
              rehypeOutsideLinks,
            ],
            remarkPlugins: [remarkUntrustedContent],
            urlTransform: untrustedMarkdownUrl,
          },
        } as unknown as MarkdownLibrary;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      }
    );
  }
  return pending;
};
