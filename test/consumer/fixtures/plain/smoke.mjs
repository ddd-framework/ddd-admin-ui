// T4: in a project without next, sonner and recharts, every entry except ./next and ./notify-sonner imports in Node;
// those two fail because their optional peer is missing. Also loads the JSON manifests.
const expectations = {
  logic: ['formatDate', 'formatDateTime', 'formatUiNumber', 'defineStatusMap', 'notify', 'setNotificationAdapter', 'describeRequestError', 'useToggle'],
  i18n: ['setTranslations', 'translateText', 'm', 'useTranslate', 'Translate', 'translationKeyOf'],
  primitives: ['cn', 'Button', 'Dialog', 'DialogContent', 'Sheet', 'SheetContent', 'Select', 'SelectContent', 'PortalContainerProvider'],
  list: ['DateCell', 'ClearFiltersButton'],
  page: ['PageFrame'],
  form: ['Form', 'FieldLabelsProvider', 'useFieldLabel'],
  translations: ['TranslatableInputField'],
  media: ['MediaItemField'],
  glass: ['GlassPanel'],
  data: ['StatTile'],
  provider: ['AdminUiProvider', 'useAdminUi', 'defaultStorageKey'],
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
