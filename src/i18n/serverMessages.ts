import { m, translateText } from './store.ts';

/**
 * Server messages in the UI language. A DDD error body carries the English message in `error`; a message with
 * variable parts may add `messageTemplate` (the same text with `%placeholder%` markers) and `messageValues` (the values
 * by placeholder name). The English text — or the template — is the UI text key, like any `t()` text: a known key shows
 * its translation, an unknown one the server's English text.
 *
 * Messages the application does not build itself (the DDD framework's not-found message, the Symfony validator's
 * constraint messages) carry no template; `FRAMEWORK_MESSAGE_PATTERNS` recognises them by their wording and turns them
 * into a template + values, so they translate as well.
 */

type MessageValue = string | number;

export interface ServerMessagePattern {
  /** Matches the whole English message; the capture groups are the values, in `names` order. */
  pattern: RegExp;
  /** The UI text key (`%name%` placeholders, or an ICU plural with `count`). */
  template: string;
  names: readonly string[];
}

/** Framework messages without a variable part: exported as keys, translated by their text. */
export const FRAMEWORK_STATIC_MESSAGES = [
  m('Request contains invalid data'),
  m('This value should not be null.'),
  m('This value should not be blank.'),
  m('The value you selected is not a valid choice.'),
  m('One or more of the given values is invalid.'),
  m('This value is not a valid email address.'),
  m('This value is not a valid URL.'),
  m('This value should be a valid number.'),
  m('Account not found or current Auth Account is not authorized to access it'),
  m('Wrong credentials.'),
  m('Refresh token invalid'),
  m('Token authentication failed'),
  m('Unauthorized'),
] as const;

const FRAMEWORK_MESSAGE_PATTERNS: readonly ServerMessagePattern[] = [
  {
    pattern: /^(.+?) not found or current authenticated Account is not authorized to access it$/,
    template: m('%entity% not found or current authenticated Account is not authorized to access it'),
    names: ['entity'],
  },
  {
    pattern: /^This value is too long\. It should have (\d+) characters? or less\.$/,
    template: m(
      '{count, plural, one {This value is too long. It should have # character or less.} other {This value is too long. It should have # characters or less.}}'
    ),
    names: ['count'],
  },
  {
    pattern: /^This value is too short\. It should have (\d+) characters? or more\.$/,
    template: m(
      '{count, plural, one {This value is too short. It should have # character or more.} other {This value is too short. It should have # characters or more.}}'
    ),
    names: ['count'],
  },
  {
    pattern: /^This value should have exactly (\d+) characters?\.$/,
    template: m(
      '{count, plural, one {This value should have exactly # character.} other {This value should have exactly # characters.}}'
    ),
    names: ['count'],
  },
  {
    pattern: /^This collection should contain (\d+) elements? or more\.$/,
    template: m(
      '{count, plural, one {This collection should contain # element or more.} other {This collection should contain # elements or more.}}'
    ),
    names: ['count'],
  },
  {
    pattern: /^This collection should contain (\d+) elements? or less\.$/,
    template: m(
      '{count, plural, one {This collection should contain # element or less.} other {This collection should contain # elements or less.}}'
    ),
    names: ['count'],
  },
  {
    pattern: /^This value should be between (.+) and (.+)\.$/,
    template: m('This value should be between %min% and %max%.'),
    names: ['min', 'max'],
  },
  { pattern: /^This value should be (.+) or more\.$/, template: m('This value should be %limit% or more.'), names: ['limit'] },
  { pattern: /^This value should be (.+) or less\.$/, template: m('This value should be %limit% or less.'), names: ['limit'] },
  {
    pattern: /^Property "(.+)" in class "(.+)" has to be unique but value "(.*)" is already in use$/,
    template: m('Property "%propertyName%" in class "%className%" has to be unique but value "%value%" is already in use'),
    names: ['propertyName', 'className', 'value'],
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The template values as `translateText` replacements (strings and finite numbers only; anything else is dropped). */
const toReplacements = (values: unknown): Record<string, MessageValue> => {
  if (!isRecord(values)) return {};
  const replacements: Record<string, MessageValue> = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) replacements[name] = value;
    else if (typeof value === 'boolean') replacements[name] = String(value);
  }
  return replacements;
};

const translateTemplate = (template: string, values: Record<string, MessageValue>): string => {
  const { count, ...replacements } = values;
  const numericCount = typeof count === 'number' ? count : typeof count === 'string' && /^\d+$/.test(count) ? Number(count) : undefined;
  return translateText(template, {
    replacements: numericCount === undefined ? values : replacements,
    ...(numericCount === undefined ? {} : { count: numericCount }),
  });
};

/**
 * One server message in the UI language: the template with its values when the server sent one, else a message
 * recognised by `patterns` (the caller's own, e.g. a screen's diagnostic texts) or a framework message, else the English
 * text as key (unknown → the text itself).
 */
export const translateServerMessage = (
  message: string,
  messageTemplate?: unknown,
  messageValues?: unknown,
  patterns: readonly ServerMessagePattern[] = []
): string => {
  if (typeof messageTemplate === 'string' && messageTemplate) {
    return translateTemplate(messageTemplate, toReplacements(messageValues));
  }
  for (const { pattern, template, names } of [...patterns, ...FRAMEWORK_MESSAGE_PATTERNS]) {
    const match = pattern.exec(message);
    if (!match) continue;
    const values: Record<string, MessageValue> = {};
    names.forEach((name, index) => {
      values[name] = match[index + 1] ?? '';
    });
    return translateTemplate(template, values);
  }
  return translateText(message);
};

const translateViolations = (validationErrors: unknown): unknown => {
  if (!isRecord(validationErrors) || !Array.isArray(validationErrors.elements)) return validationErrors;
  return {
    ...validationErrors,
    elements: validationErrors.elements.map(group =>
      isRecord(group) && Array.isArray(group.elements)
        ? {
            ...group,
            elements: group.elements.map(violation =>
              isRecord(violation) && typeof violation.errorMessage === 'string' && violation.errorMessage
                ? { ...violation, errorMessage: translateServerMessage(violation.errorMessage) }
                : violation
            ),
          }
        : group
    ),
  };
};

/**
 * A DDD error body with `error` and every validation violation's `errorMessage` in the UI language (a new object; the
 * English message stays in `errorEnglish`). Anything that is not a DDD error body comes back unchanged.
 */
export const translateDddErrorBody = (body: unknown): unknown => {
  if (!isRecord(body) || typeof body.error !== 'string' || !body.error) return body;
  const translated: Record<string, unknown> = {
    ...body,
    error: translateServerMessage(body.error, body.messageTemplate, body.messageValues),
    errorEnglish: body.error,
  };
  if ('validationErrors' in body) translated.validationErrors = translateViolations(body.validationErrors);
  return translated;
};

/**
 * An RTK Query error (`{ status, data }`) with its DDD body translated; anything else unchanged. Base queries apply it
 * to every failed request, so every screen's error toast, banner and inline message shows the UI language.
 */
export const translateDddRequestError = <TError>(error: TError): TError => {
  if (!isRecord(error) || !('data' in error)) return error;
  const data = translateDddErrorBody(error.data);
  return data === error.data ? error : { ...error, data };
};
