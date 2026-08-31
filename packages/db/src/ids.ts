export function createId(prefix?: string): string {
  const id = crypto.randomUUID().replaceAll('-', '');
  return prefix ? `${prefix}_${id.slice(0, 20)}` : id;
}

export function nowMs(): number {
  return Date.now();
}

export function toRfc3339(ms: number | null | undefined): string | null {
  if (ms == null) {
    return null;
  }
  return new Date(ms).toISOString();
}
