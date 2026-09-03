import {
  DateTimePicker,
  Field,
  Stack,
  Tabs,
  Text,
  localTimeZone,
  timeZoneLabel,
} from '@trustfall/design';
import { useState } from 'react';

export type WhenMode = 'NOW' | 'CUSTOM';

/**
 * Start now vs a picked instant, shared by opening an incident and posting
 * an update. The picker is the operator's own zone.
 */
export function WhenField({
  id,
  mode,
  at,
  onModeChange,
  onAtChange,
  disabled = false,
  nowLabel = 'Start now',
  customLabel = 'Started',
}: {
  id: string;
  mode: WhenMode;
  at: number | null;
  onModeChange: (mode: WhenMode) => void;
  onAtChange: (at: number) => void;
  disabled?: boolean;
  nowLabel?: string;
  customLabel?: string;
}) {
  const [openedAt] = useState(() => Date.now());
  const timeZone = localTimeZone();

  function setMode(next: WhenMode) {
    onModeChange(next);
    if (next === 'CUSTOM' && at == null) {
      onAtChange(Date.now());
    }
  }

  return (
    <>
      <Stack gap={2}>
        <Text tone="caption">When</Text>
        <Tabs
          items={[
            { id: 'NOW', label: nowLabel },
            { id: 'CUSTOM', label: 'Custom time' },
          ]}
          value={mode}
          onChange={(next) => setMode(next as WhenMode)}
        />
      </Stack>
      {mode === 'CUSTOM' ? (
        <Field
          label={customLabel}
          htmlFor={id}
          hint={`Times are in ${timeZone} (${timeZoneLabel(timeZone, at ?? openedAt)}).`}
        >
          <DateTimePicker id={id} value={at} disabled={disabled} onChange={onAtChange} />
        </Field>
      ) : null}
    </>
  );
}

/** Empty or future custom times are refused; "now" always passes. */
export function whenError(mode: WhenMode, at: number | null, nowLabel: string): string | null {
  if (mode !== 'CUSTOM') {
    return null;
  }
  if (at == null) {
    return 'Pick a time.';
  }
  if (at > Date.now()) {
    return `The time cannot be in the future. Use "${nowLabel}" to post right away.`;
  }
  return null;
}
