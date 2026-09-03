/**
 * Gravatar, opt-in per person. Turning it on stores the Gravatar URL as the
 * account's `image`, so everywhere the console shows a picture shows it with
 * no further lookups; turning it off clears the image again. Nothing about
 * the email leaves the browser except its hash, and only once someone asks.
 */
const GRAVATAR_ORIGIN = 'https://gravatar.com/avatar/';

/** Sized for a 2x render of the console's avatars; 404 lets initials stand in. */
const GRAVATAR_QUERY = '?s=128&d=404';

export async function gravatarUrl(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${GRAVATAR_ORIGIN}${hex}${GRAVATAR_QUERY}`;
}

export function isGravatarUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith(GRAVATAR_ORIGIN);
}
