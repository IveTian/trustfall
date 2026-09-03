import {
  DateTimePicker,
  Field,
  Input,
  RichTextEditor,
  Select,
  Stack,
  Tabs,
  Text,
  timeZoneLabel,
  weekdayIndex,
  WeekdayPicker,
} from '@trustfall/design';
import type { MaintenanceFrequency, MaintenanceRecurrence } from '@trustfall/shared';
import { type FormEvent, useState } from 'react';
import { durationOptions, localTimeZone, type MaintenancePayload } from '../lib/maintenance.ts';
import type { AffectedComponent, AffectedGroup } from './AffectedComponentsField.tsx';
import { MaintenanceComponentsField } from './MaintenanceComponentsField.tsx';

/** How the window is placed: right away, at a chosen time, or on a rule. */
export type ScheduleMode = 'NOW' | 'SCHEDULED' | 'RECURRING';

/** The schedule half of the form; name and message travel through the form itself. */
export type ScheduleValue = {
  mode: ScheduleMode;
  startsAt: number | null;
  durationMinutes: number;
  frequency: MaintenanceFrequency;
  interval: number;
  byWeekday: number[];
  until: number | null;
  componentIds: ReadonlySet<string>;
};

/** What the operator asked for, spelled out for the review step. */
export type MaintenanceDraft = {
  title: string;
  body: string;
  mode: ScheduleMode;
  startsAt: number | null;
  durationMinutes: number;
  recurrence: MaintenanceRecurrence | null;
  componentIds: string[];
  timeZone: string;
};

/**
 * What the maintenance's state lets the form touch. Under way, the start and
 * the rule are history and only the end can move; finished, only the words.
 */
export type ScheduleLock = 'none' | 'in-progress' | 'finished';

export function defaultSchedule(): ScheduleValue {
  return {
    mode: 'NOW',
    startsAt: null,
    durationMinutes: 60,
    frequency: 'WEEKLY',
    interval: 1,
    byWeekday: [],
    until: null,
    componentIds: new Set(),
  };
}

const MODE_TABS: Array<{ id: ScheduleMode; label: string }> = [
  { id: 'NOW', label: 'Start now' },
  { id: 'SCHEDULED', label: 'Schedule' },
  { id: 'RECURRING', label: 'Repeat' },
];

const FREQUENCY_OPTIONS: Array<{ value: MaintenanceFrequency; label: string }> = [
  { value: 'DAILY', label: 'Days' },
  { value: 'WEEKLY', label: 'Weeks' },
  { value: 'MONTHLY', label: 'Months' },
];

/**
 * The fields shared by "schedule a maintenance" and "edit this maintenance":
 * name, announcement, when it runs, and what it touches. Name and message are
 * uncontrolled and read from the form on submit; the schedule is state. Submit
 * hands back both the request body and a plain-language draft for review.
 */
export function MaintenanceForm({
  formId,
  initial,
  initialTitle = '',
  initialBody = '',
  components,
  groups,
  lock = 'none',
  disabled = false,
  onSubmit,
}: {
  formId: string;
  initial: ScheduleValue;
  initialTitle?: string;
  initialBody?: string;
  components: AffectedComponent[];
  groups: AffectedGroup[];
  lock?: ScheduleLock;
  disabled?: boolean;
  onSubmit: (payload: MaintenancePayload, draft: MaintenanceDraft) => void;
}) {
  const [value, setValue] = useState<ScheduleValue>(initial);
  const [error, setError] = useState<string | null>(null);
  // When the form opened: the instant the zone label is read at until a
  // start is picked.
  const [openedAt] = useState(() => Date.now());
  const timeZone = localTimeZone();

  function patch(next: Partial<ScheduleValue>) {
    setValue((prev) => ({ ...prev, ...next }));
  }

  function setMode(mode: ScheduleMode) {
    const startsAt = mode === 'NOW' ? value.startsAt : (value.startsAt ?? nextRoundHour());
    // A weekly rule with no days picked fires on the first window's weekday;
    // showing that choice pressed makes the rule legible.
    const byWeekday =
      mode === 'RECURRING' && value.byWeekday.length === 0 && startsAt != null
        ? [weekdayIndex(startsAt, timeZone)]
        : value.byWeekday;
    patch({ mode, startsAt, byWeekday });
  }

  function toggleComponents(ids: string[], included: boolean) {
    setValue((prev) => {
      const next = new Set(prev.componentIds);
      for (const id of ids) {
        if (included) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return { ...prev, componentIds: next };
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    if (!body) {
      setError('Message is required.');
      return;
    }
    const scheduleOpen = lock === 'none';
    if (scheduleOpen && value.mode !== 'NOW') {
      if (value.startsAt == null) {
        setError('Pick when the maintenance starts.');
        return;
      }
      if (isInPast(value.startsAt)) {
        setError('The start is in the past. Use "Start now" to begin right away.');
        return;
      }
      if (value.mode === 'RECURRING' && value.until != null && value.until <= value.startsAt) {
        setError('The series must end after its first window starts.');
        return;
      }
      if (
        value.mode === 'RECURRING' &&
        value.frequency === 'WEEKLY' &&
        value.byWeekday.length === 0
      ) {
        setError('Pick at least one day of the week.');
        return;
      }
    }
    setError(null);

    const recurrence: MaintenanceRecurrence | null =
      value.mode === 'RECURRING'
        ? {
            frequency: value.frequency,
            interval: Math.max(1, Math.floor(value.interval)),
            ...(value.frequency === 'WEEKLY' ? { byWeekday: value.byWeekday } : {}),
            until: value.until,
          }
        : null;
    const componentIds = components
      .filter((component) => value.componentIds.has(component.id))
      .map((component) => component.id);

    const payload: MaintenancePayload = { title, body };
    if (lock !== 'finished') {
      payload.component_ids = componentIds;
      payload.duration_minutes = value.durationMinutes;
    }
    if (scheduleOpen) {
      payload.time_zone = timeZone;
      payload.recurrence = recurrence
        ? {
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            ...(recurrence.byWeekday ? { by_weekday: recurrence.byWeekday } : {}),
            until: recurrence.until == null ? null : new Date(recurrence.until).toISOString(),
          }
        : null;
      if (value.mode !== 'NOW' && value.startsAt != null) {
        payload.starts_at = new Date(value.startsAt).toISOString();
      }
    }
    onSubmit(payload, {
      title,
      body,
      mode: value.mode,
      startsAt: value.mode === 'NOW' ? null : value.startsAt,
      durationMinutes: value.durationMinutes,
      recurrence,
      componentIds,
      timeZone,
    });
  }

  const zoneHint = `Times are in ${timeZone} (${timeZoneLabel(timeZone, value.startsAt ?? openedAt)}).`;
  const scheduleOpen = lock === 'none';

  return (
    <form id={formId} onSubmit={submit}>
      <Stack gap={3}>
        <Field label="Name" htmlFor={`${formId}-title`}>
          <Input
            id={`${formId}-title`}
            name="title"
            required
            defaultValue={initialTitle}
            disabled={disabled}
          />
        </Field>
        <Field label="Message" htmlFor={`${formId}-body`}>
          <RichTextEditor
            id={`${formId}-body`}
            name="body"
            defaultValue={initialBody}
            disabled={disabled}
          />
        </Field>

        {lock === 'finished' ? null : (
          <Stack gap={3}>
            {scheduleOpen ? (
              <Stack gap={2}>
                <Text tone="caption">When</Text>
                <Tabs
                  items={MODE_TABS}
                  value={value.mode}
                  onChange={(id) => setMode(id as ScheduleMode)}
                />
              </Stack>
            ) : (
              <Text tone="caption">
                This maintenance is under way. Its start and rule are set; the end can still move.
              </Text>
            )}

            {scheduleOpen && value.mode !== 'NOW' ? (
              <Field
                label={value.mode === 'RECURRING' ? 'First window starts' : 'Starts'}
                htmlFor={`${formId}-starts`}
                hint={zoneHint}
              >
                <DateTimePicker
                  id={`${formId}-starts`}
                  value={value.startsAt}
                  disabled={disabled}
                  onChange={(startsAt) => patch({ startsAt })}
                />
              </Field>
            ) : null}

            <Field label="Duration" htmlFor={`${formId}-duration`}>
              <Select
                id={`${formId}-duration`}
                defaultValue={String(value.durationMinutes)}
                disabled={disabled}
                options={durationOptions(value.durationMinutes)}
                onChange={(minutes) => patch({ durationMinutes: Number(minutes) })}
              />
            </Field>

            {scheduleOpen && value.mode === 'RECURRING' ? (
              <>
                <Field label="Repeat every" htmlFor={`${formId}-interval`}>
                  <Stack direction="horizontal" gap={2}>
                    <Input
                      id={`${formId}-interval`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      value={value.interval}
                      disabled={disabled}
                      onChange={(event) =>
                        patch({
                          interval: Math.max(
                            1,
                            Math.min(99, Number(event.currentTarget.value) || 1),
                          ),
                        })
                      }
                    />
                    <Select
                      label="Unit"
                      defaultValue={value.frequency}
                      disabled={disabled}
                      options={FREQUENCY_OPTIONS}
                      onChange={(frequency) =>
                        patch({ frequency: frequency as MaintenanceFrequency })
                      }
                    />
                  </Stack>
                </Field>
                {value.frequency === 'WEEKLY' ? (
                  <Field label="On">
                    <WeekdayPicker
                      value={value.byWeekday}
                      disabled={disabled}
                      onChange={(byWeekday) => patch({ byWeekday })}
                    />
                  </Field>
                ) : null}
                <Field label="Ends" htmlFor={`${formId}-ends`}>
                  <Stack gap={2}>
                    <Select
                      id={`${formId}-ends`}
                      defaultValue={value.until == null ? 'never' : 'on'}
                      disabled={disabled}
                      options={[
                        { value: 'never', label: 'Never' },
                        { value: 'on', label: 'On a date' },
                      ]}
                      onChange={(choice) =>
                        patch({
                          until:
                            choice === 'never'
                              ? null
                              : (value.until ??
                                (value.startsAt ?? nextRoundHour()) + 30 * 24 * 60 * 60_000),
                        })
                      }
                    />
                    {value.until != null ? (
                      <DateTimePicker
                        label="Last window may start"
                        value={value.until}
                        disabled={disabled}
                        onChange={(until) => patch({ until })}
                      />
                    ) : null}
                  </Stack>
                </Field>
              </>
            ) : null}

            <MaintenanceComponentsField
              components={components}
              groups={groups}
              selected={value.componentIds}
              onToggle={toggleComponents}
              disabled={disabled}
            />
          </Stack>
        )}

        {error != null ? <Text tone="caption">{error}</Text> : null}
      </Stack>
    </form>
  );
}

function isInPast(at: number): boolean {
  return at <= Date.now();
}

/** The next full hour: where a scheduled window lands until the operator moves it. */
function nextRoundHour(): number {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date.getTime();
}
