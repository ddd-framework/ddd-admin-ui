'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type ReactNode, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { MaintenanceActionCard, type MaintenanceActionOutcome } from '../page/MaintenanceActionCard.tsx';
import type { TranslationsApi } from './api.ts';

/** What `importFromConfig` re-imports with the package's own operations and texts. */
export type ConfigImportKind = 'languages' | 'locales';

/**
 * The texts of an import the host brings (`ConfigImportCard` with its own `kind` and `operation`, e.g. countries),
 * already translated. Every text the host leaves out falls back to a generic one.
 */
export interface ConfigImportTexts {
  /** The card's title (`Import countries from the configuration`). */
  title?: string;
  /** The card's description. */
  description?: ReactNode;
  /** The confirmation's title (`Import the countries from the configuration?`). */
  confirmTitle?: string;
  /** The confirmation's description. */
  confirmDescription?: string;
  /** The outcome and toast after a run, from the number of imported rows (`Imported 12 countries …`). */
  result?: (count: number) => string;
}

export interface ConfigImportOptions {
  /** The import itself for a kind of the host (`kind` other than `languages` / `locales`): answers the imported rows' count. */
  operation?: () => Promise<number>;
  /** The texts of that import (and overrides of the package's for `languages` / `locales`). */
  texts?: ConfigImportTexts;
}

export interface ConfigImport {
  /** Asks first (it overwrites stored rows with the configured ones), then imports. */
  run: () => Promise<void>;
  isRunning: boolean;
  outcome: MaintenanceActionOutcome | null;
}

/**
 * The import of the configured languages or locales (`GET …/importFromConfig`), or of a kind the host brings with its
 * own `operation` and `texts` (countries): rows are matched and updated, new ones inserted. Confirms first, toasts and
 * keeps the outcome for a `MaintenanceActionCard`.
 */
export const useConfigImport = (api: TranslationsApi, kind: ConfigImportKind | (string & {}), options: ConfigImportOptions = {}): ConfigImport => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const [importLanguages, languagesState] = api.useImportLanguagesFromConfigMutation();
  const [importLocales, localesState] = api.useImportLocalesFromConfigMutation();
  const [isRunningOwn, setIsRunningOwn] = useState(false);
  const [outcome, setOutcome] = useState<MaintenanceActionOutcome | null>(null);
  const { operation, texts = {} } = options;

  const run = async () => {
    if (!writeAccess.allowed) return;
    const confirmed = await confirm({
      title:
        texts.confirmTitle ??
        (kind === 'languages'
          ? t('Import the languages from the configuration?')
          : kind === 'locales'
            ? t('Import the locales from the configuration?')
            : t('Import from the configuration?')),
      description:
        texts.confirmDescription ??
        t('Stored rows are matched and updated with the configured values, new ones are added. Rows that are not configured stay.'),
      confirmLabel: t('Import', { context: 'action' }),
    });
    if (!confirmed) return;
    setOutcome(null);
    try {
      let count: number;
      if (operation) {
        setIsRunningOwn(true);
        try {
          count = await operation();
        } finally {
          setIsRunningOwn(false);
        }
      } else if (kind === 'languages') {
        count = (await importLanguages().unwrap()).languages.elements?.length ?? 0;
      } else if (kind === 'locales') {
        count = (await importLocales().unwrap()).locales.elements?.length ?? 0;
      } else {
        throw new Error(t('No import operation for “%kind%”.', { replacements: { kind } }));
      }
      const result =
        texts.result?.(count) ??
        (kind === 'languages'
          ? t('{count, plural, one {Imported # language from the configuration} other {Imported # languages from the configuration}}', { count })
          : kind === 'locales'
            ? t('{count, plural, one {Imported # locale from the configuration} other {Imported # locales from the configuration}}', { count })
            : t('{count, plural, one {Imported # row from the configuration} other {Imported # rows from the configuration}}', { count }));
      setOutcome({ result });
      notify.success(result);
    } catch (error) {
      const message = normalizeDddError(error, t('The import from the configuration failed.')).message;
      setOutcome({ error: message });
      notify.error(message);
    }
  };

  const isRunning = operation ? isRunningOwn : kind === 'languages' ? languagesState.isLoading : kind === 'locales' ? localesState.isLoading : false;
  return { run, isRunning, outcome };
};

export interface ConfigImportCardProps {
  api: TranslationsApi;
  /** `languages` / `locales` (the package's operations and texts), or a kind of the host with `operation` and `texts`. */
  kind: ConfigImportKind | (string & {});
  /** Replaces the default description (e.g. the host's config file). */
  description?: ReactNode;
  /** The import of a host kind (countries): answers the imported rows' count. Replaces the package's operation of `languages` / `locales`. */
  operation?: () => Promise<number>;
  /** The texts of a host kind (title, confirmation, result), already translated. */
  texts?: ConfigImportTexts;
  className?: string;
}

/**
 * The import of the configured languages or locales as a maintenance action (title, description, run, outcome); a
 * host kind (countries) passes its `operation` and `texts`.
 *
 * ```tsx
 * <ConfigImportCard api={translationsApi} kind="countries" operation={async () => (await importCountries().unwrap()).countries.elements?.length ?? 0}
 *   texts={{ title: countriesTitle, result: count => countriesResult(count) }} />
 * ```
 */
export const ConfigImportCard = ({ api, kind, description, operation, texts, className }: ConfigImportCardProps) => {
  const { t } = useTranslate();
  const configImport = useConfigImport(api, kind, { operation, texts });
  return (
    <MaintenanceActionCard
      title={
        texts?.title ??
        (kind === 'languages'
          ? t('Import languages from the configuration')
          : kind === 'locales'
            ? t('Import locales from the configuration')
            : t('Import from the configuration'))
      }
      description={
        description ??
        texts?.description ??
        (kind === 'languages'
          ? t('Creates or updates every language of the configuration, matched by language code.')
          : kind === 'locales'
            ? t('Creates or updates every locale of the configuration, matched by language and country code.')
            : t('Creates or updates every configured row, matched by its key.'))
      }
      onRun={() => void configImport.run()}
      isRunning={configImport.isRunning}
      outcome={configImport.outcome}
      runLabel={t('Import', { context: 'action' })}
      className={className}
    />
  );
};
