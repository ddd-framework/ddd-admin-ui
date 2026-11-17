'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type ReactNode, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { MaintenanceActionCard, type MaintenanceActionOutcome } from '../page/MaintenanceActionCard.tsx';
import type { TranslationsApi } from './api.ts';

/** What `importFromConfig` re-imports. */
export type ConfigImportKind = 'languages' | 'locales';

export interface ConfigImport {
  /** Asks first (it overwrites stored rows with the configured ones), then imports. */
  run: () => Promise<void>;
  isRunning: boolean;
  outcome: MaintenanceActionOutcome | null;
}

/**
 * The import of the configured languages or locales (`GET …/importFromConfig`): rows are matched and updated, new ones
 * inserted. Confirms first, toasts and keeps the outcome for a `MaintenanceActionCard`.
 */
export const useConfigImport = (api: TranslationsApi, kind: ConfigImportKind): ConfigImport => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const [importLanguages, languagesState] = api.useImportLanguagesFromConfigMutation();
  const [importLocales, localesState] = api.useImportLocalesFromConfigMutation();
  const [outcome, setOutcome] = useState<MaintenanceActionOutcome | null>(null);

  const run = async () => {
    if (!writeAccess.allowed) return;
    const confirmed = await confirm({
      title: kind === 'languages' ? t('Import the languages from the configuration?') : t('Import the locales from the configuration?'),
      description: t('Stored rows are matched and updated with the configured values, new ones are added. Rows that are not configured stay.'),
      confirmLabel: t('Import', { context: 'action' }),
    });
    if (!confirmed) return;
    setOutcome(null);
    try {
      const count =
        kind === 'languages'
          ? ((await importLanguages().unwrap()).languages.elements?.length ?? 0)
          : ((await importLocales().unwrap()).locales.elements?.length ?? 0);
      const result =
        kind === 'languages'
          ? t('{count, plural, one {Imported # language from the configuration} other {Imported # languages from the configuration}}', { count })
          : t('{count, plural, one {Imported # locale from the configuration} other {Imported # locales from the configuration}}', { count });
      setOutcome({ result });
      notify.success(result);
    } catch (error) {
      const message = normalizeDddError(error, t('The import from the configuration failed.')).message;
      setOutcome({ error: message });
      notify.error(message);
    }
  };

  return { run, isRunning: kind === 'languages' ? languagesState.isLoading : localesState.isLoading, outcome };
};

export interface ConfigImportCardProps {
  api: TranslationsApi;
  kind: ConfigImportKind;
  /** Replaces the default description (e.g. the host's config file). */
  description?: ReactNode;
  className?: string;
}

/** The import of the configured languages or locales as a maintenance action (title, description, run, outcome). */
export const ConfigImportCard = ({ api, kind, description, className }: ConfigImportCardProps) => {
  const { t } = useTranslate();
  const configImport = useConfigImport(api, kind);
  return (
    <MaintenanceActionCard
      title={kind === 'languages' ? t('Import languages from the configuration') : t('Import locales from the configuration')}
      description={
        description ??
        (kind === 'languages'
          ? t('Creates or updates every language of the configuration, matched by language code.')
          : t('Creates or updates every locale of the configuration, matched by language and country code.'))
      }
      onRun={() => void configImport.run()}
      isRunning={configImport.isRunning}
      outcome={configImport.outcome}
      runLabel={t('Import', { context: 'action' })}
      className={className}
    />
  );
};
