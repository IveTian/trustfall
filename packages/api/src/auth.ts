import { createDb, getSetting, setSetting } from '@trustfall/db';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { env } from 'cloudflare:workers';
import type { AppBindings } from './env.ts';

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | undefined;
let cachedSecret: string | undefined;
let cachedBaseURL: string | undefined;

/** Local admin (Vite), API, and wrangler preview — Better Auth CSRF-checks Origin. */
const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4321',
  'http://localhost:8787',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:8787',
];

function authTrustedOrigins(baseURL?: string): string[] {
  const origins = [...LOCAL_ORIGINS];
  if (!baseURL) {
    return origins;
  }
  try {
    origins.push(new URL(baseURL).origin);
  } catch {
    // BETTER_AUTH_URL is optional; ignore a malformed value.
  }
  return origins;
}

function createAuth(database: D1Database, secret: string, baseURL?: string) {
  return betterAuth({
    ...(baseURL ? { baseURL } : {}),
    trustedOrigins: authTrustedOrigins(baseURL),
    database,
    secret,
    appName: 'TrustFall',
    emailAndPassword: {
      enabled: true,
      // Public /sign-up/email stays closed. After setup, accounts are created
      // only through invite-link registration, which calls the admin plugin's
      // createUser API — the same path setup uses for the owner.
      disableSignUp: true,
    },
    advanced: { database: { joins: true } },
    plugins: [admin()],
  });
}

export async function resolveAuthSecret(bindings: AppBindings): Promise<string> {
  if (bindings.BETTER_AUTH_SECRET && bindings.BETTER_AUTH_SECRET.length >= 32) {
    return bindings.BETTER_AUTH_SECRET;
  }
  const db = createDb(bindings.DB);
  try {
    const stored = await getSetting(db, 'authSecret');
    if (stored) {
      return stored;
    }
  } catch {
    // Settings table is missing until migrations run.
  }
  const generated = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
  await setSetting(db, 'authSecret', generated);
  return generated;
}

export async function getAuth(bindings: AppBindings = env as AppBindings): Promise<Auth> {
  const secret = await resolveAuthSecret(bindings);
  const baseURL = bindings.BETTER_AUTH_URL;
  if (cached && cachedSecret === secret && cachedBaseURL === baseURL) {
    return cached;
  }
  cachedSecret = secret;
  cachedBaseURL = baseURL;
  cached = createAuth(bindings.DB, secret, baseURL);
  return cached;
}
