import { createDb, getSetting, setSetting } from '@trustfall/db';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { env } from 'cloudflare:workers';
import type { AppBindings } from './env.ts';

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | undefined;
let cachedSecret: string | undefined;

function createAuth(database: D1Database, secret: string) {
  return betterAuth({
    database,
    secret,
    appName: 'TrustFall',
    emailAndPassword: {
      enabled: true,
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
  if (cached && cachedSecret === secret) {
    return cached;
  }
  cachedSecret = secret;
  cached = createAuth(bindings.DB, secret);
  return cached;
}
