// T4: in a project without next, sonner and recharts, every entry except ./next and ./notify-sonner imports in Node;
// those two fail because their optional peer is missing. Also loads the JSON manifests.
const expectations = {
  logic: ['formatDate', 'formatDateTime', 'defineStatusMap', 'notify', 'setNotificationAdapter', 'toFormSubmitError', 'useUrlListState', 'useEntityTranslations', 'prepareImageFile', 'nextListSort', 'parseListSort', 'formatListSort', 'computeListTracks', 'resolveListPins', 'useConfirm', 'ConfirmContext', 'createConfirmQueue', 'WriteAccessProvider', 'useWriteAccess', 'narrowWriteAccess'],
  i18n: ['setTranslations', 'translateText', 'm', 'useTranslate', 'Translate', 'translationKeyOf', 'formatUiNumber', 'translateServerMessage'],
  primitives: ['cn', 'SegmentedControl', 'Button', 'Dialog', 'DialogContent', 'Sheet', 'SheetContent', 'Select', 'SelectContent', 'Tooltip', 'TooltipProvider', 'FormActionsSlot', 'FormActionsSlotProvider'],
  list: ['EntityListCard', 'EntityListToolbar', 'EntityListBody', 'EntityListTable', 'EntityListEmpty', 'DateCell', 'StatusBadge', 'FilterPanel'],
  page: ['PageFrame', 'PageHeader', 'EntityListPage', 'EntityDetailShell', 'StatusCallout'],
  form: ['Form', 'FormField', 'FormActions', 'FormDrawer', 'FormErrors', 'FormSubmitButton', 'useConfirmDialog', 'FormDialog'],
  translations: ['FormTranslatableInput', 'FormTranslatableMarkdown', 'TranslatableInput', 'TranslationControls', 'createTranslationsApi', 'AppTranslationsScreen', 'LocalesScreen', 'useEntityTranslator'],
  media: ['FormMediaItemField', 'MediaItemField', 'MediaItemPickerDialog', 'MediaPreview'],
  glass: ['GlassPill', 'QuickFilterPills', 'CollapsibleCard', 'GlassGroup', 'ActionRow'],
  provider: ['AdminUiProvider', 'useAdminUi', 'defaultStorageKey'],
  showcase: ['Showcase', 'SHOWCASE_COVERAGE'],
  data: ['MetricTile', 'MetricGrid', 'DeltaText', 'NoteList', 'relativeChange'],
  // its optional peers are imported only after hydration, so the entry loads without them
  markdown: ['MarkdownEditor', 'MarkdownPreview', 'renderMarkdownEditor'],
  workers: ['createWorkersApi', 'createStaticWorkersApi', 'WorkersOverviewScreen', 'WorkerTransportScreen', 'WORKER_TRANSPORT_STATE'],
  shell: ['AppShell', 'ShellBreadcrumbs', 'ShellDocumentTitle', 'AccountMenu', 'LanguageMenu', 'useSidebarCollapsed', 'useShellShortcut'],
  'shell-background': ['ShaderBackground', 'tintShaderPalette'],
  'design-studio': ['designStudioComponents'],
};

let failed = false;
for (const [entry, names] of Object.entries(expectations)) {
  const module = await import(`@mgamadeus/ddd-admin-ui/${entry}`);
  const missing = names.filter((name) => !(name in module));
  if (missing.length > 0) {
    console.error(`FAILED ./${entry}: missing ${missing.join(', ')}`);
    failed = true;
  } else {
    console.log(`ok      ./${entry} (${Object.keys(module).length} exports)`);
  }
}

for (const [entry, peer] of [['next', 'next'], ['notify-sonner', 'sonner']]) {
  try {
    await import(`@mgamadeus/ddd-admin-ui/${entry}`);
    console.error(`FAILED ./${entry} imported although ${peer} is not installed`);
    failed = true;
  } catch (error) {
    const isMissingPeer = error?.code === 'ERR_MODULE_NOT_FOUND' && String(error.message).includes(`'${peer}`);
    console.log(`${isMissingPeer ? 'ok     ' : 'FAILED '} ./${entry} needs ${peer} (${error?.code})`);
    if (!isMissingPeer) {
      console.error(error);
      failed = true;
    }
  }
}

const tokens = (await import('@mgamadeus/ddd-admin-ui/tokens.json', { with: { type: 'json' } })).default;
const keys = (await import('@mgamadeus/ddd-admin-ui/i18n-keys.json', { with: { type: 'json' } })).default;
const manifest = (await import('@mgamadeus/ddd-admin-ui/package.json', { with: { type: 'json' } })).default;
if (Object.keys(tokens.colors).length === 0 || keys.package !== manifest.name || keys.version !== manifest.version) {
  console.error('FAILED tokens.json / i18n-keys.json');
  failed = true;
} else {
  console.log(`ok      tokens.json (${Object.keys(tokens.colors).length} colours), i18n-keys.json (${keys.keys.length} keys)`);
}
if (failed) process.exit(1);
