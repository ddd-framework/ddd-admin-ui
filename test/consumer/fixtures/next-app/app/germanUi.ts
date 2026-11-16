// The fixture app's UI language: German, set once at module load. The text store is module state of the package, so
// on the server it is shared by every route of this app; every client route that renders package texts imports this
// module, so its server render and its hydration render use the same language.
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';

setTranslations('de', 'FORMAL', { 'Clear search': 'Suche zurücksetzen' });
