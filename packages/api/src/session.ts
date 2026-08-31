import { createMiddleware } from 'hono/factory';
import { getAuth } from './auth.ts';
import type { AppEnv, SessionPayload } from './env.ts';
import { ApiError, RpcStatus } from './errors.ts';

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('session', (session as SessionPayload | null) ?? null);
  await next();
});

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session');
  if (!session) {
    throw new ApiError(RpcStatus.UNAUTHENTICATED, 'Sign in to continue.');
  }
  await next();
});

export const authMiddleware = [sessionMiddleware, requireSession];
