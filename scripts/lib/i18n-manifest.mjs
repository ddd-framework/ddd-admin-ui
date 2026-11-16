// Collects the translatable texts of the package source into the `i18n-keys.json` manifest.
// A host's translation export reads the manifest of every installed package, so block texts keep their translations.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listFiles } from './source-scan.mjs';

export const GENERATED_BY = 'scripts/build-i18n-manifest.mjs';
export const IGNORE_FILE_MARKER = '@translations-ignore-file';

const LITERAL = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\x60(?:[^\x60\\$]|\\.)*\x60`;
/** `t('…')`, `translateText('…')`, `m('…')`, each with an optional second argument `{ context: '…' }`. */
const CALL = new RegExp(String.raw`(?<![\w$.])(?:t|translateText|m)\(\s*(${LITERAL})\s*(,\s*\{[^}]*\})?`, 'g');
const CONTEXT = new RegExp(String.raw`context\s*:\s*(${LITERAL})`);
/** `<Translate context="…">text</Translate>`. */
const ELEMENT = /<Translate\b([^>]*)>([^<{}]+)<\/Translate>/g;
const ELEMENT_CONTEXT = /context=(?:"([^"]*)"|'([^']*)'|\{\s*['"]([^'"]*)['"]\s*\})/;

const unquote = (literal) =>
  literal
    .slice(1, -1)
    .replace(/\\n/g, '\n')
    .replace(/\\(.)/g, '$1');

/** Same as `translationKeyOf` in `src/i18n/store.ts`. */
export const translationKeyOf = (text, context) => (context ? `${text}__${context}` : text);

const isSourceFile = (file) => /\.(ts|tsx)$/.test(file) && !/\.d\.ts$/.test(file) && !/\.(test|spec)\.tsx?$/.test(file);

/**
 * Every translatable text of one source file.
 *
 * @returns {{ text: string, context?: string }[]}
 */
export function extractTexts(source) {
  if (source.includes(IGNORE_FILE_MARKER)) return [];
  const texts = [];
  for (const match of source.matchAll(CALL)) {
    const context = match[2] ? CONTEXT.exec(match[2]) : null;
    texts.push({ text: unquote(match[1]), ...(context ? { context: unquote(context[1]) } : {}) });
  }
  for (const match of source.matchAll(ELEMENT)) {
    const context = ELEMENT_CONTEXT.exec(match[1]);
    const contextValue = context ? (context[1] ?? context[2] ?? context[3]) : undefined;
    texts.push({ text: match[2].replace(/\s+/g, ' ').trim(), ...(contextValue ? { context: contextValue } : {}) });
  }
  return texts;
}

/**
 * The manifest of a source tree.
 *
 * @param {{ sourceDir: string, hintsFile: string, packageName: string, version: string }} options
 * @returns {{ manifest: object, missingHints: string[] }}
 */
export function buildI18nManifest({ sourceDir, hintsFile, packageName, version }) {
  const hints = fs.existsSync(hintsFile) ? JSON.parse(fs.readFileSync(hintsFile, 'utf-8')) : {};
  /** @type {Map<string, { key: string, text: string, context?: string, files: Set<string> }>} */
  const byKey = new Map();
  for (const file of listFiles(sourceDir).filter(isSourceFile)) {
    const source = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    for (const { text, context } of extractTexts(source)) {
      const key = translationKeyOf(text, context);
      const entry = byKey.get(key) ?? { key, text, ...(context ? { context } : {}), files: new Set() };
      entry.files.add(file);
      byKey.set(key, entry);
    }
  }
  const missingHints = [];
  const keys = [...byKey.values()]
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map(({ key, text, context, files }) => {
      const hint = typeof hints[key] === 'string' ? hints[key] : '';
      if (hint === '') missingHints.push(key);
      return { key, text, ...(context ? { context } : {}), hint, files: [...files].sort() };
    });
  return { manifest: { package: packageName, version, generatedBy: GENERATED_BY, keys }, missingHints };
}

/** The manifest as written to disk. */
export const serializeManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

/** Builds the manifest of a repository root (`src/`, `i18n/hints.json`, `package.json`). */
export function buildI18nManifestForRoot(rootDir, sourceDir = path.join(rootDir, 'src')) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return buildI18nManifest({
    sourceDir,
    hintsFile: path.join(rootDir, 'i18n', 'hints.json'),
    packageName: packageJson.name,
    version: packageJson.version,
  });
}
