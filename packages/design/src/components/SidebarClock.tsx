import * as stylex from '@stylexjs/stylex';
import { useEffect, useState } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { timeZoneCity, timeZoneLabel, useTimeZone } from '../time-zone.ts';

function formatClock(at: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(at));
}

/**
 * The console rail's live clock: the zone the times are shown in, then
 * HH:MM:ss in that zone. Left-aligned so it lines up with the nav labels.
 */
export function SidebarClock() {
  const zone = useTimeZone();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const iso = new Date(now).toISOString();
  return (
    <div {...stylex.props(styles.root)}>
      <p {...stylex.props(styles.zone)}>
        {timeZoneLabel(zone, now)} {timeZoneCity(zone)}
      </p>
      <time dateTime={iso} title={`${iso} UTC`} {...stylex.props(styles.clock)}>
        {formatClock(now, zone)}
      </time>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    minWidth: 0,
    paddingBlock: space[2],
    textAlign: 'start',
  },
  zone: {
    color: color.navText,
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    lineHeight: text.lineCaption,
    margin: 0,
  },
  clock: {
    color: color.navTextActive,
    fontFamily: text.familyMono,
    fontSize: text.sizeHeadline,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: text.weightBold,
    letterSpacing: text.trackingDisplay,
    lineHeight: text.lineHeadline,
  },
});
