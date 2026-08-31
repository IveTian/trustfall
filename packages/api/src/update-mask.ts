export function applyUpdateMask<T extends Record<string, unknown>>(
  mask: string | undefined,
  body: T,
): T {
  if (!mask) {
    return body;
  }
  const allowed = new Set(
    mask
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean),
  );
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.has(key))) as T;
}
