'use client';

import { getErrorStatus, normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Download, Eye, RefreshCw } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { CopyButton } from '../list/CopyButton.tsx';
import { StatusCallout, StatusCalloutAction } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { Input } from '../primitives/input.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { DatabaseApi } from './api.ts';

/** Saves `text` as a file in the browser (an object URL on a temporary link). */
export const downloadText = (text: string, filename: string, type = 'text/plain'): void => {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export interface CodeBlockProps {
  /** The text, shown as is in a monospace block that scrolls inside itself. */
  code: string;
  /** The name a download is saved under (`schema.sql`); without it no download button. */
  filename?: string;
  /** The accessible name of the block (`SQL of Orders`). */
  label: string;
  className?: string;
}

/** Generated text (SQL, model code): a bounded monospace block that scrolls inside itself, with copy and download. */
export const CodeBlock = ({ code, filename, label, className }: CodeBlockProps) => {
  const { t } = useTranslate();
  return (
    <div data-slot="code-block" className={cn('min-w-0 space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <CopyButton value={code} label={t('Copy %label%', { replacements: { label } })} notify={t('Copied')} />
        {filename && (
          <Button type="button" variant="ghost" size="sm" onClick={() => downloadText(code, filename)}>
            <Download aria-hidden />
            {t('Download')}
          </Button>
        )}
      </div>
      <pre
        aria-label={label}
        tabIndex={0}
        className="max-h-[28rem] max-w-full overflow-auto rounded-xl bg-tint p-3 font-mono text-xs leading-5 whitespace-pre"
      >
        {code}
      </pre>
    </div>
  );
};

/** Which generated code a `GeneratedCodePanel` shows. */
export type GeneratedCodeKind = 'tables' | 'models' | 'entity';

export interface GeneratedCodePanelProps {
  api: DatabaseApi;
  kind: GeneratedCodeKind;
  /** Called with the server's message when the server answers 403 (schema writes disabled on this process). */
  onForbidden?: (message: string) => void;
  className?: string;
}

const FILENAMES: Record<Exclude<GeneratedCodeKind, 'entity'>, string> = {
  tables: 'database-tables.sql',
  models: 'doctrine-models.php',
};

/**
 * The text routes of the trait, requested on demand and shown read-only: the SQL that creates every table
 * (`tables`), the model code of every database entity (`models`) or of one entity by name (`entity`). Nothing is
 * executed or written. A 403 (schema writes disabled; `tables` only) shows the server's message.
 */
export const GeneratedCodePanel = ({ api, kind, onForbidden, className }: GeneratedCodePanelProps) => {
  const { t } = useTranslate();
  const [requested, setRequested] = useState(false);
  const [entityDraft, setEntityDraft] = useState('');
  const [entityName, setEntityName] = useState('');

  const tablesQuery = api.useDatabaseTablesSqlQuery(undefined, { skip: kind !== 'tables' || !requested });
  const modelsQuery = api.useDoctrineModelsCodeQuery(undefined, { skip: kind !== 'models' || !requested });
  const entityQuery = api.useDoctrineModelForEntityQuery({ entityName }, { skip: kind !== 'entity' || entityName === '' });
  const query = kind === 'tables' ? tablesQuery : kind === 'models' ? modelsQuery : entityQuery;

  const title =
    kind === 'tables' ? t('SQL of every table') : kind === 'models' ? t('Model code of every entity') : t('Model code of one entity');
  const description =
    kind === 'tables'
      ? t('The statements that create the whole schema from the entities, without the excluded tables. Shown only, never run.')
      : kind === 'models'
        ? t('The Doctrine models as the model generator would write them. Nothing is written.')
        : t('One database entity by its short or fully qualified class name. Nothing is written.');

  const errorMessage = query.isError ? normalizeDddError(query.error, t('The code could not be generated.')).message : undefined;
  const forbidden = query.isError && getErrorStatus(query.error) === 403;
  const onForbiddenRef = useRef(onForbidden);
  onForbiddenRef.current = onForbidden;
  useEffect(() => {
    if (forbidden && errorMessage) onForbiddenRef.current?.(errorMessage);
  }, [forbidden, errorMessage]);

  const submitEntity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntityName(entityDraft.trim());
  };

  const code = query.currentData ?? (query.isFetching ? undefined : query.data);
  const filename = kind === 'entity' ? `${entityName.replace(/^.*\\/, '') || 'entity'}.php` : FILENAMES[kind];
  const shown = kind === 'entity' ? entityName !== '' : requested;

  return (
    <Card data-slot="generated-code-panel" data-kind={kind} className={cn('min-w-0 gap-0 py-0', className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
          {kind !== 'entity' &&
            (requested ? (
              <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>
                <RefreshCw aria-hidden className={cn(query.isFetching && 'animate-spin motion-reduce:animate-none')} />
                {t('Generate again')}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setRequested(true)}>
                <Eye aria-hidden />
                {t('Show', { context: 'generated-code' })}
              </Button>
            ))}
        </div>

        {kind === 'entity' && (
          <form className="flex flex-wrap gap-2" onSubmit={submitEntity}>
            <Input
              value={entityDraft}
              onChange={event => setEntityDraft(event.target.value)}
              placeholder={t('Entity class, e.g. Account')}
              aria-label={t('Entity class name')}
              className="min-w-0 flex-1 basis-48 font-mono"
            />
            <Button type="submit" variant="outline" disabled={entityDraft.trim() === ''}>
              <Eye aria-hidden />
              {t('Show', { context: 'generated-code' })}
            </Button>
          </form>
        )}

        {shown && errorMessage && (
          <StatusCallout
            tone={forbidden ? 'warning' : 'destructive'}
            size="compact"
            title={forbidden ? t('Not available on this process') : t('The code could not be generated.')}
            description={<span className="break-words">{errorMessage}</span>}
            actions={
              forbidden ? undefined : (
                <StatusCalloutAction type="button" onClick={() => void query.refetch()}>
                  {t('Retry')}
                </StatusCalloutAction>
              )
            }
          />
        )}
        {shown && query.isFetching && code === undefined && !errorMessage && (
          <div className="space-y-2" role="status" aria-label={t('Generating…')}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {shown && !errorMessage && typeof code === 'string' && (
          <div data-slot="generated-code">
            {code.trim() === '' ? (
              <p className="text-sm text-muted-foreground">{t('Nothing was generated.')}</p>
            ) : (
              <CodeBlock code={code} filename={filename} label={title} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
