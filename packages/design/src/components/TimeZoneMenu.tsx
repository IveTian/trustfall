import { useState, useSyncExternalStore } from 'react';
import {
  applyTimeZone,
  LOCAL_TIME_ZONE,
  readTimeZonePreference,
  resolveTimeZone,
  subscribeTimeZone,
  timeZoneLabel,
} from '../time-zone.ts';
import { Icon } from './Icon.tsx';
import { Menu, type MenuRadius } from './Menu.tsx';

/** A short list a reader can scan; the browser's own zone is always first. */
const ZONES: Array<{ id: string; label: string }> = [
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/Denver', label: 'Denver' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/Sao_Paulo', label: 'São Paulo' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Kolkata', label: 'Mumbai' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Shanghai', label: 'Shanghai' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Australia/Perth', label: 'Perth' },
  { id: 'Australia/Sydney', label: 'Sydney' },
];

/**
 * The server cannot know the reader's zone, so it paints nothing specific and
 * the first client render — which hydrates against this same value — does the
 * same. The stored preference lands on the render right after.
 */
function serverPreference(): null {
  return null;
}

/**
 * The public site's clock control: the offset every timestamp on the page is
 * shown in, and a radio menu to change it. The choice is remembered per
 * browser and broadcast so the clocks re-read it.
 */
export function TimeZoneMenu({ radius }: { radius?: MenuRadius } = {}) {
  const preference = useSyncExternalStore(
    subscribeTimeZone,
    readTimeZonePreference,
    serverPreference,
  );
  // Offsets only move at a DST boundary; the moment the control mounted is
  // close enough, and it keeps the render pure.
  const [now] = useState(() => Date.now());
  const offset = preference === null ? null : timeZoneLabel(resolveTimeZone(preference), now);
  const localOffset =
    preference === null ? null : timeZoneLabel(resolveTimeZone(LOCAL_TIME_ZONE), now);

  return (
    <Menu
      radius={radius}
      label={offset ? `Time zone: ${offset}` : 'Time zone'}
      items={[
        {
          id: LOCAL_TIME_ZONE,
          label: localOffset ? `Local · ${localOffset}` : 'Local',
          selected: preference === LOCAL_TIME_ZONE,
          onSelect: () => applyTimeZone(LOCAL_TIME_ZONE),
        },
        ...ZONES.map((zone) => ({
          id: zone.id,
          label: `${zone.label} · ${timeZoneLabel(zone.id, now)}`,
          selected: preference === zone.id,
          onSelect: () => applyTimeZone(zone.id),
        })),
      ]}
    >
      <Icon name="time-zone" size={16} />
      {offset ?? 'Local'}
    </Menu>
  );
}
