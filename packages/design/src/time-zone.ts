import { useSyncExternalStore } from 'react';

export const TIME_ZONE_STORAGE_KEY = 'tf-time-zone';
/** Fired on `window` after `applyTimeZone` so every island showing a clock re-reads it. */
export const TIME_ZONE_CHANGE_EVENT = 'tf-time-zone-change';

/** `local` follows the browser; anything else is an IANA zone name. */
export const LOCAL_TIME_ZONE = 'local';

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The zone the browser (or, on the server, the runtime) reports. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The stored preference: `local`, or an IANA zone that this runtime can format. */
export function readTimeZonePreference(): string {
  if (typeof localStorage === 'undefined') {
    return LOCAL_TIME_ZONE;
  }
  const value = localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  return value && value !== LOCAL_TIME_ZONE && isValidTimeZone(value) ? value : LOCAL_TIME_ZONE;
}

/** The IANA zone a preference means right now. */
export function resolveTimeZone(preference: string): string {
  return preference === LOCAL_TIME_ZONE ? localTimeZone() : preference;
}

export function applyTimeZone(preference: string): void {
  localStorage.setItem(TIME_ZONE_STORAGE_KEY, preference);
  document.documentElement.dataset.timeZone = resolveTimeZone(preference);
  window.dispatchEvent(new Event(TIME_ZONE_CHANGE_EVENT));
}

/** For `useSyncExternalStore`: this tab's own changes and another tab's. */
export function subscribeTimeZone(onChange: () => void): () => void {
  window.addEventListener(TIME_ZONE_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(TIME_ZONE_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** "GMT+8" for the zone the times are shown in; the IANA name when unknown. */
export function timeZoneLabel(timeZone: string | undefined, at: number): string {
  try {
    const part = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date(at))
      .find((item) => item.type === 'timeZoneName');
    return part?.value ?? timeZone ?? 'local time';
  } catch {
    return timeZone ?? 'local time';
  }
}

/**
 * The city an IANA zone is named for — the last path segment, spaces for
 * underscores. "UTC" stays "UTC".
 */
export function timeZoneCity(timeZone: string): string {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC' || timeZone === 'Etc/GMT') {
    return 'UTC';
  }
  const leaf = timeZone.split('/').pop() ?? timeZone;
  return leaf.replaceAll('_', ' ');
}

function noPreference(): null {
  return null;
}

/**
 * The zone a component should format its clocks in. An explicit zone wins;
 * otherwise the reader's stored preference, resolved to an IANA name. The
 * server cannot know the reader, so it — and the client's first paint, which
 * hydrates against it — speak UTC; the preference lands on the render after.
 */
export function useTimeZone(explicit?: string): string {
  const preference = useSyncExternalStore(subscribeTimeZone, readTimeZonePreference, noPreference);
  if (explicit) {
    return explicit;
  }
  return preference === null ? 'UTC' : resolveTimeZone(preference);
}
