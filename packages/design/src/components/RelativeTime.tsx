function formatRelative(date: Date, now = new Date()): string {
  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

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

export function RelativeTime({ value }: { value: string | number | Date }) {
  const date = value instanceof Date ? value : new Date(value);
  const iso = date.toISOString();
  return (
    <time dateTime={iso} title={`${iso} UTC`}>
      {formatRelative(date)}
    </time>
  );
}
