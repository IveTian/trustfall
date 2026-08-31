import { createDb } from '@trustfall/db';
import { env } from 'cloudflare:workers';
import type { AppBindings } from './env.ts';

export function bindings(): AppBindings {
  return env as AppBindings;
}

export function db() {
  return createDb(bindings().DB);
}
