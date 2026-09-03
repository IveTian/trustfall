import { useSyncExternalStore } from 'react';

function formatRelative(date: Date, now: Date): string {
  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 60) {
    return rtf.format(Math.round(deltaSeconds), 'second');
  }
  if (abs < 3600) {
    return rtf.format(Math.round(deltaSeconds / 60), 'minute');
  }
  if (abs < 86400) {
    return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
  }
  return rtf.format(Math.round(deltaSeconds / 86400), 'day');
}

/**
 * One clock for every relative time on the page: it ticks once a minute
 * while something is listening, so "7 minutes ago" keeps up without each
 * element keeping its own timer.
 */
const TICK_MS = 60_000;
let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    tick = Date.now();
    timer = setInterval(() => {
      tick = Date.now();
      listeners.forEach((fn) => fn());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function readTick(): number {
  if (tick === 0) {
    tick = Date.now();
  }
  return tick;
}

/** The server has no clock to share; it renders against its own moment. */
function serverTick(): null {
  return null;
}

/**
 * "7 minutes ago", against the shared clock. A cached page is rendered once
 * for everyone, so the server's wording is hydrated as-is and replaced by
 * the reader's own on the first client render.
 */
export function RelativeTime({ value }: { value: string | number | Date }) {
  const date = value instanceof Date ? value : new Date(value);
  const now = useSyncExternalStore(subscribe, readTick, serverTick);
  const iso = date.toISOString();
  return (
    <time dateTime={iso} title={`${iso} UTC`} suppressHydrationWarning>
      {formatRelative(date, now === null ? new Date() : new Date(now))}
    </time>
  );
}
