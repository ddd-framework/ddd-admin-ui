// Server render and pure checks of the additions of 0.3.12: delta saves of translatable texts (`useEntityTranslations`
// with `translationSaveMode`, `getBaseline`, `buildDeltaPayload`, `buildSavePayload`, `omitScalars`, `rebase`; the pure
// helpers of ./logic/pure), `BackgroundTranslationControls` on external progress rows (no cancel, optional "Dismiss",
// failures with reason and detail), the per-locale markers with their summary line and the "Save and translate" label
// on both translation controls. `TranslationControls` without the new props renders as on 0.3.11.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-0312-render.mjs
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { toTranslatableLocale, useEntityTranslations } from '@mgamadeus/ddd-admin-ui/logic';
import {
  buildDeltaTranslationInfos,
  rebaseTranslations,
  TRANSLATION_INFOS_OBJECT_TYPE,
  translationProgressRowsOf,
} from '@mgamadeus/ddd-admin-ui/logic/pure';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { BackgroundTranslationControls, TranslationControls } from '@mgamadeus/ddd-admin-ui/translations';

setTranslations('en', 'FORMAL', {});
const render = element => renderToStaticMarkup(h(AdminUiProvider, {}, element));
const checks = [];
const count = (html, pattern) => (html.match(pattern) ?? []).length;

// ── the hook: baseline, delta payload, save mode, rebase ───────────────────────────────────────────────────────────
const FIELDS = ['name', 'description'];
const LOCALES = ['en::FORMAL', 'de::FORMAL'];
const captured = {};
const Probe = ({ mode }) => {
  captured[mode ?? 'default'] = useEntityTranslations({ fields: FIELDS, locales: LOCALES, defaultLocale: 'en::FORMAL', translationSaveMode: mode });
  return null;
};
render(h('div', null, h(Probe, { mode: 'delta' }), h(Probe, {})));
const delta = captured.delta;
const replace = captured.default;
const loaded = {
  name: 'Hello',
  translationInfos: { translationsStore: { name: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo' }, description: { 'en::FORMAL': 'Text' }, slogan: { 'en::FORMAL': 'Kept' } } },
};
checks.push(['delta: no baseline before the first hydration', delta.getBaseline() === null && delta.translationSaveMode === 'delta' && replace.translationSaveMode === 'replace']);
const hydrated = delta.hydrate(loaded);
replace.hydrate(loaded);
checks.push(['delta: the baseline is the loaded store (a copy)', JSON.stringify(delta.getBaseline()) === JSON.stringify({ name: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo' }, description: { 'en::FORMAL': 'Text' } }) && delta.getBaseline() !== delta.getBaseline()]);
const unchanged = structuredClone(hydrated);
checks.push(['delta: nothing changed, no save payload (leave translationInfos out)', delta.buildSavePayload(unchanged) === undefined && delta.hasDelta(unchanged) === false]);
const edited = { name: { 'en::FORMAL': 'Hello', 'de::FORMAL': '' }, description: { 'en::FORMAL': 'Text, new' } };
checks.push([
  'delta: only the changed keys, a cleared key as null, merge mode, no other field',
  JSON.stringify(delta.buildSavePayload(edited)) ===
    JSON.stringify({ objectType: TRANSLATION_INFOS_OBJECT_TYPE, replaceExistingTranslations: false, translationsStore: { name: { 'de::FORMAL': null }, description: { 'en::FORMAL': 'Text, new' } } }),
]);
const replacePayload = replace.buildSavePayload(edited);
checks.push([
  'replace (default): the whole store with the other fields, replaceExistingTranslations true',
  replacePayload?.replaceExistingTranslations === true && JSON.stringify(replacePayload.translationsStore) === JSON.stringify({ slogan: { 'en::FORMAL': 'Kept' }, name: { 'en::FORMAL': 'Hello' }, description: { 'en::FORMAL': 'Text, new' } }),
]);
checks.push([
  'omitScalars: delta leaves out the plain translatable values (keep a required one), replace sends the body as it is',
  JSON.stringify(delta.omitScalars({ id: 3, name: 'Hello', description: null })) === JSON.stringify({ id: 3 }) &&
    JSON.stringify(delta.omitScalars({ id: 3, name: 'Hello', description: null }, ['name'])) === JSON.stringify({ id: 3, name: 'Hello' }) &&
    JSON.stringify(replace.omitScalars({ id: 3, name: 'Hello', description: null })) === JSON.stringify({ id: 3, name: 'Hello', description: null }),
]);
// a background translation stored French while the form was open
const newer = {
  translationInfos: { translationsStore: { name: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Bonjour' }, description: { 'en::FORMAL': 'Text' } } },
};
const rebased = delta.rebase(newer, edited);
checks.push([
  'rebase: untouched keys take the newer text, touched keys stay as typed, the newer store is the baseline',
  JSON.stringify(rebased.values) === JSON.stringify({ name: { 'en::FORMAL': 'Hello', 'de::FORMAL': '', 'fr::FORMAL': 'Bonjour' }, description: { 'en::FORMAL': 'Text, new' } }) &&
    rebased.hasDelta === true &&
    JSON.stringify(rebased.stored.name) === JSON.stringify({ 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Bonjour' }),
]);
checks.push([
  'rebase: the next delta still holds only the user changes, never the background key',
  JSON.stringify(delta.buildDeltaPayload(rebased.values).translationsStore) === JSON.stringify({ name: { 'de::FORMAL': null }, description: { 'en::FORMAL': 'Text, new' } }),
]);
delta.commit(rebased.values);
checks.push(['commit: the saved texts are the baseline (nothing left to send)', delta.buildSavePayload(rebased.values) === undefined]);

// ── pure helpers from ./logic/pure ─────────────────────────────────────────────────────────────────────────────────
checks.push([
  'logic/pure: delta infos and rebase',
  JSON.stringify(buildDeltaTranslationInfos({ name: { 'fr::FORMAL': 'Salut' } }, { name: {} }, ['name']).translationsStore) === '{"name":{"fr::FORMAL":null}}' &&
    JSON.stringify(rebaseTranslations({ name: {} }, { name: {} }, { name: { 'fr::FORMAL': 'Salut' } }, ['name']).values) === '{"name":{"fr::FORMAL":"Salut"}}',
]);
const rows = translationProgressRowsOf([
  { id: 1, languageCode: 'de', status: 'COMPLETED' },
  { id: 2, languageCode: 'fr', status: 'FAILED', failureReason: 'PROVIDER_ERROR', failureMessage: 'PROVIDER_ERROR: description (HTTP 503)' },
  { id: 3, languageCode: 'it', status: 'RUNNING' },
  { id: 4, languageCode: 'es', status: 'QUEUED' },
]);
checks.push(['logic/pure: progress rows per language', rows.map(row => `${row.locale}:${row.status}`).join(',') === 'de:done,fr:failed,it:running,es:pending']);

// ── BackgroundTranslationControls ──────────────────────────────────────────────────────────────────────────────────
const locales = ['en::FORMAL', 'de::FORMAL', 'fr::FORMAL', 'it::FORMAL', 'es::FORMAL'].map(toTranslatableLocale);
const base = { locales, defaultLocale: 'en::FORMAL', selected: ['fr::FORMAL'], onSelectedChange: () => {}, onTranslate: () => {} };
const running = render(h(BackgroundTranslationControls, { ...base, rows, onDismiss: () => {} }));
checks.push(
  ['background: one row per language with its status attribute', ['done', 'failed', 'running', 'pending'].every(status => running.includes(`data-translation-status="${status}"`)) && count(running, /data-translation-status=/g) === 4],
  ['background: the failure with reason, property and detail', running.includes('The translation service did not answer (description): HTTP 503')],
  ['background: no cancel; no Dismiss while a row runs', !running.includes('>Cancel<') && !running.includes('Dismiss')],
  ['background: no native title attribute', !/\stitle="/.test(running)],
);
const ended = render(h(BackgroundTranslationControls, { ...base, rows: rows.filter(row => row.status === 'done' || row.status === 'failed'), onDismiss: () => {} }));
const endedWithoutDismiss = render(h(BackgroundTranslationControls, { ...base, rows: rows.filter(row => row.status === 'done') }));
checks.push(
  ['background: Dismiss once every row ended', ended.includes('Dismiss')],
  ['background: Dismiss is optional', !endedWithoutDismiss.includes('Dismiss')],
);
const clean = render(h(BackgroundTranslationControls, { ...base, rows: [] }));
const dirty = render(h(BackgroundTranslationControls, { ...base, rows: [], isDirty: true, disabledReason: 'Save the record first' }));
checks.push(
  ['background: the start button reads "Save and translate" while the form is dirty', dirty.includes('Save and translate') && !clean.includes('Save and translate') && clean.includes('Translate to selected locales')],
  ['background: the disabled reason is shown as text', dirty.includes('Save the record first')],
  ['background: no marker without localeMarkers', !clean.includes('data-translation-marker')],
);
const marked = render(h(BackgroundTranslationControls, { ...base, rows: [], localeMarkers: { de: 2, 'fr::FORMAL': 1, it: 0 } }));
checks.push(
  ['background: markers by language and by key, a zero count draws none', count(marked, /data-translation-marker="/g) === 2 && marked.includes('data-translation-marker="2"') && marked.includes('data-translation-marker="1"')],
  ['background: the marker meaning as screen-reader text', marked.includes('Source changed after the translation: 2 texts')],
  ['background: the summary line names each marked language with its count', /data-translation-marker-summary=""/.test(marked) && marked.includes('The source text changed after the translation:') && marked.includes('DE (2 texts), FR (1 text)')],
);
const ownSummary = render(h(BackgroundTranslationControls, { ...base, rows: [], localeMarkers: { de: 1 }, markerLabel: 'Outdated', markerSummaryLabel: null }));
checks.push(['background: own marker label, no summary line with markerSummaryLabel null', ownSummary.includes('Outdated: 1 text') && !ownSummary.includes('data-translation-marker-summary')]);

// ── TranslationControls: the new props, and unchanged without them ────────────────────────────────────────────────
const legacyBase = { ...base, locales, onCancel: () => {}, onDismiss: () => {}, progress: [{ locale: 'de::FORMAL', status: 'done' }], isRunning: false };
const legacy = render(h(TranslationControls, legacyBase));
checks.push([
  'controls: without the new props as on 0.3.11 (no marker, no summary, the old label, the plain chip class)',
  !legacy.includes('data-translation-marker') && !legacy.includes('Save and translate') && legacy.includes('Translate to selected locales') && !legacy.includes('inline-flex items-center gap-1 rounded-md'),
]);
const legacyNew = render(h(TranslationControls, { ...legacyBase, isDirty: true, localeMarkers: { fr: 3 } }));
checks.push(
  ['controls: "Save and translate" while dirty', legacyNew.includes('Save and translate')],
  ['controls: the marker and the summary line', legacyNew.includes('data-translation-marker="3"') && legacyNew.includes('FR (3 texts)')],
);
const legacyRunning = render(h(TranslationControls, { ...legacyBase, isDirty: true, isRunning: true }));
checks.push(['controls: while running the button still reads "Translating…"', legacyRunning.includes('Translating…') && !legacyRunning.includes('Save and translate')]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
