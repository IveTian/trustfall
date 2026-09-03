import { timeZoneLabel, useTimeZone } from '../time-zone.ts';

/**
 * An absolute moment — "3 Sept 2026, 15:30 (GMT+8)" — in the reader's chosen
 * zone, so the number and the zone are always read together. The UTC instant
 * stays on the element for hover and assistive technology.
 */
export function DateTime({
  value,
  timeZone,
  locale = 'en',
}: {
  value: string | number | Date;
  /** Pins the zone; omit to follow the reader's preference. */
  timeZone?: string;
  /** Pinned by default so a page rendered once reads the same everywhere. */
  locale?: string;
}) {
  const zone = useTimeZone(timeZone);
  const date = value instanceof Date ? value : new Date(value);
  const iso = date.toISOString();
  const label = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
  return (
    <time dateTime={iso} title={`${iso} UTC`}>
      {label} ({timeZoneLabel(zone, date.getTime())})
    </time>
  );
}
