import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { translateText } from '../../i18n/store.ts';

/** The message of a failed DDD request, ready to show: the backend message, else a translated fallback. */
export const describeRequestError = (error: unknown): string =>
  normalizeDddError(error, translateText('The request failed')).message;
