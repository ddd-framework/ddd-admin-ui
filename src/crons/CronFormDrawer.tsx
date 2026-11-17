'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Form } from '../form/Form.tsx';
import { FormActions } from '../form/FormActions.tsx';
import { FormDrawer } from '../form/FormDrawer.tsx';
import { FormErrors } from '../form/FormErrors.tsx';
import { FormField } from '../form/FormField.tsx';
import { FormSubmitButton } from '../form/FormSubmitButton.tsx';
import { useTranslate } from '../i18n/useTranslate.ts';
import { Combobox, type ComboboxOption } from '../list/Combobox.tsx';
import { notify } from '../logic/pure/notify.ts';
import { type FormSubmitError, toFormSubmitError } from '../logic/pure/submitError.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useDebouncedValue } from '../logic/react/useDebouncedValue.ts';
import { useFormDirty } from '../logic/react/useFormDirty.ts';
import { useUnsavedChangesGuard } from '../logic/react/useUnsavedChangesGuard.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { ControlHint } from '../primitives/hint.tsx';
import { Input } from '../primitives/input.tsx';
import { Switch } from '../primitives/switch.tsx';
import { Textarea } from '../primitives/textarea.tsx';
import type { CronsApi } from './api.ts';
import {
  changedCronFields,
  composeCronCommandLine,
  CRON_SCHEDULE_PRESETS,
  type CronFormValues,
  describeCronSchedule,
  EMPTY_CRON_FORM,
  formatCronDateTime,
  isCronArguments,
  isCronName,
  toCronCreateBody,
  toCronFormValues,
} from './format.ts';
import type { CronOverview } from './types.ts';

/** Wait after the last keystroke in the schedule before the preview is asked for. */
export const CRON_SCHEDULE_PREVIEW_DEBOUNCE_MS = 400;
const DESCRIPTION_MIN = 16;
const DESCRIPTION_MAX = 255;

export interface CronSchedulePreviewProps {
  api: CronsApi;
  schedule: string;
}

/** Whether the expression is valid and its next 5 slots (`GET /schedule-preview`, debounced). */
export const CronSchedulePreview = ({ api, schedule }: CronSchedulePreviewProps) => {
  const { t } = useTranslate();
  const debounced = useDebouncedValue(schedule.trim(), CRON_SCHEDULE_PREVIEW_DEBOUNCE_MS);
  const query = api.useCronSchedulePreviewQuery({ schedule: debounced }, { skip: debounced === '' });
  const preview = debounced === '' ? undefined : query.currentData;
  if (debounced === '') return null;
  return (
    <div data-slot="cron-schedule-preview" aria-live="polite" className="space-y-1 text-xs">
      {!preview ? (
        <p className="text-muted-foreground">{t('Checking the schedule…')}</p>
      ) : preview.isValid ? (
        <>
          <p className="text-success">{t('%reading% · next runs (server time):', { replacements: { reading: describeCronSchedule(debounced, t) } })}</p>
          <ol className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground tabular-nums">
            {(preview.nextRuns.elements ?? []).map(slot => (
              <li key={slot.scheduledAt ?? ''}>{formatCronDateTime(slot.scheduledAt)}</li>
            ))}
          </ol>
        </>
      ) : (
        <p className="text-destructive" data-cron-schedule-invalid="">
          {preview.error ?? t('This is not a valid cron expression.')}
        </p>
      )}
    </div>
  );
};

interface CronFormProps {
  api: CronsApi;
  /** The Cron to edit; `undefined` creates one. */
  cron: CronOverview | undefined;
  onClose: () => void;
  onSaved?: (cron: CronOverview) => void;
}

const CronForm = ({ api, cron, onClose, onSaved }: CronFormProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const isCreate = cron === undefined;
  const baseline = useMemo(() => (cron ? toCronFormValues(cron) : EMPTY_CRON_FORM), [cron]);
  const form = useForm<CronFormValues>({ mode: 'onTouched', defaultValues: baseline });
  useEffect(() => {
    form.reset(baseline);
  }, [baseline, form]);
  const confirm = useConfirm();
  const { confirmDiscard } = useUnsavedChangesGuard(useFormDirty(form), confirm);
  const [createCron, createState] = api.useCreateCronMutation();
  const [updateCron, updateState] = api.useUpdateCronMutation();
  const [submitError, setSubmitError] = useState<FormSubmitError | null>(null);
  const commandsQuery = api.useCronCommandsQuery(undefined);
  const values = useWatch({ control: form.control }) as CronFormValues;

  const commandOptions = useMemo<ComboboxOption[]>(
    () =>
      (commandsQuery.data?.commands.elements ?? []).map(command => {
        const usedBy = (command.usedByCronNames ?? []).join(', ');
        return {
          value: command.name,
          label: command.name,
          description: [command.description, usedBy ? t('used by %crons%', { replacements: { crons: usedBy } }) : ''].filter(Boolean).join(' · '),
          translate: false,
        };
      }),
    [commandsQuery.data, t]
  );
  // a stored command the list no longer offers (a missing command) stays visible as the picked one
  const selectedCommand = useMemo<ComboboxOption | undefined>(
    () => (values.commandName && !commandOptions.some(option => option.value === values.commandName) ? { value: values.commandName, label: values.commandName, translate: false } : undefined),
    [commandOptions, values.commandName]
  );

  const isPending = createState.isLoading || updateState.isLoading;
  const descriptionLength = (values.description ?? '').trim().length;
  const commandLine = composeCronCommandLine(values.commandName ?? '', values.arguments);

  const handleSave = async (formValues: CronFormValues) => {
    if (!writeAccess.allowed) return;
    setSubmitError(null);
    let invalid = false;
    if (!isCronName(formValues.name.trim())) {
      form.setError('name', { message: t('3 to 80 lowercase letters, digits and single hyphens, e.g. send-reminders') });
      invalid = true;
    }
    if (!formValues.commandName) {
      form.setError('commandName', { message: t('Pick a command') });
      invalid = true;
    }
    if (!isCronArguments(formValues.arguments)) {
      form.setError('arguments', { message: t('One line without quote characters') });
      invalid = true;
    }
    if (!formValues.schedule.trim()) {
      form.setError('schedule', { message: t('Enter a cron expression') });
      invalid = true;
    }
    if (invalid) return;
    try {
      let saved: CronOverview;
      if (isCreate) {
        saved = (await createCron(toCronCreateBody(formValues)).unwrap()).cron;
      } else {
        const changes = changedCronFields(baseline, formValues);
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        saved = (await updateCron({ cronId: cron.id, ...changes }).unwrap()).cron;
      }
      form.reset(formValues, { keepValues: true });
      notify.success(isCreate ? t('Created %name%', { replacements: { name: saved.name } }) : t('Saved %name%', { replacements: { name: saved.name } }));
      onSaved?.(saved);
      onClose();
    } catch (failure) {
      const submitFailure = toFormSubmitError(failure, isCreate ? t('The Cron could not be created.') : t('The Cron could not be saved.'));
      setSubmitError({ ...submitFailure, message: normalizeDddError(failure, submitFailure.message).message });
    }
  };

  return (
    <Form form={form} onSubmit={handleSave} className="space-y-4">
      <div data-slot="cron-form" className="space-y-4">
        <FormErrors error={submitError} />
        {cron?.status === 'MISSING_COMMAND' && (
          <StatusCallout
            tone="warning"
            size="compact"
            title={t('This build does not have the command %command%', { replacements: { command: cron.commandName ?? '' } })}
            description={t('Pick a command of this build, or delete the Cron.')}
          />
        )}
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-4">
            <FormField<CronFormValues, 'name'> name="name" label={t('Name')} required description={t('Lowercase letters, digits and single hyphens: send-reminders')}>
              {({ field, control }) => <Input {...control} {...field} autoComplete="off" spellCheck={false} className="font-mono" />}
            </FormField>
            <FormField<CronFormValues, 'description'>
              name="description"
              label={t('Description')}
              required
              description={
                <span className={cn('tabular-nums', descriptionLength > 0 && (descriptionLength < DESCRIPTION_MIN || descriptionLength > DESCRIPTION_MAX) && 'text-destructive')}>
                  {t('What it is for, %min% to %max% characters · %count%', {
                    replacements: { min: String(DESCRIPTION_MIN), max: String(DESCRIPTION_MAX), count: String(descriptionLength) },
                  })}
                </span>
              }
            >
              {({ field, control }) => <Textarea {...control} {...field} rows={2} />}
            </FormField>
            <FormField<CronFormValues, 'commandName'> name="commandName" label={t('Command')} required description={t('Only commands marked as schedulable are offered.')}>
              {({ field, control, disabled }) => (
                <Combobox
                  id={control.id}
                  aria-label={t('Command')}
                  options={commandOptions}
                  value={field.value}
                  onChange={field.onChange}
                  selectedOption={selectedCommand}
                  isLoading={commandsQuery.isLoading}
                  placeholder={t('Pick a command')}
                  searchPlaceholder={t('Search commands…')}
                  emptyMessage={t('No schedulable command')}
                  disabled={disabled}
                />
              )}
            </FormField>
            <FormField<CronFormValues, 'arguments'> name="arguments" label={t('Arguments')} description={t('One line, no quote characters.')}>
              {({ field, control }) => <Input {...control} {...field} autoComplete="off" spellCheck={false} className="font-mono" placeholder={t('e.g. --limit=100')} />}
            </FormField>
            {commandLine && (
              <p className="text-xs text-muted-foreground">
                {t('Runs:')} <code className="font-mono break-all text-foreground" data-slot="cron-command-line">{commandLine}</code>
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="space-y-3 p-4">
            <FormField<CronFormValues, 'schedule'> name="schedule" label={t('Schedule')} required description={t('Five fields: minute, hour, day of month, month, day of week (server time).')}>
              {({ field, control }) => <Input {...control} {...field} autoComplete="off" spellCheck={false} className="font-mono" placeholder="*/5 * * * *" />}
            </FormField>
            <div className="flex flex-wrap gap-1.5" data-slot="cron-schedule-presets">
              {CRON_SCHEDULE_PRESETS.map(preset => (
                <ControlHint key={preset.expression} label={<code className="font-mono">{preset.expression}</code>}>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => form.setValue('schedule', preset.expression, { shouldDirty: true, shouldValidate: false })}
                  >
                    {t(preset.label)}
                  </Button>
                </ControlHint>
              ))}
            </div>
            <CronSchedulePreview api={api} schedule={values.schedule ?? ''} />
          </CardContent>
        </Card>
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch ref={field.ref} checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
              {t('Active: the runner takes it at its next slot')}
            </label>
          )}
        />
      </div>
      <FormActions
        secondary={
          <Button type="button" variant="outline" disabled={isPending} onClick={() => void confirmDiscard().then(discard => discard && onClose())}>
            {t('Cancel', { context: 'dialog-action' })}
          </Button>
        }
        primary={
          <FormSubmitButton isPending={isPending} pendingLabel={t('Saving…')}>
            {isCreate ? t('Create Cron') : t('Save', { context: 'action' })}
          </FormSubmitButton>
        }
      />
    </Form>
  );
};

export interface CronFormDrawerProps {
  api: CronsApi;
  open: boolean;
  /** The Cron to edit; `undefined` creates one. */
  cron?: CronOverview;
  /** A key that changes with every opening (the form starts from the Cron again). */
  formKey?: string;
  onClose: () => void;
  onSaved?: (cron: CronOverview) => void;
}

/**
 * The create and edit form of a Cron in a drawer: a schedulable command (no free text), its arguments with the composed
 * command line, the schedule with presets and a live preview, name, description, on / off. A save sends only the
 * changed fields (`PATCH`); a 400 places its violations on their fields.
 */
export const CronFormDrawer = ({ api, open, cron, formKey, onClose, onSaved }: CronFormDrawerProps) => {
  const { t } = useTranslate();
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={cron ? t('Edit %name%', { replacements: { name: cron.name } }) : t('Add Cron')}
      description={cron ? undefined : t('Schedule a console command; it is due at the next slot of its schedule.')}
      metadata={cron ? { id: cron.id } : undefined}
    >
      <CronForm key={formKey ?? (cron ? `edit-${cron.id}` : 'create')} api={api} cron={cron} onClose={onClose} onSaved={onSaved} />
    </FormDrawer>
  );
};
