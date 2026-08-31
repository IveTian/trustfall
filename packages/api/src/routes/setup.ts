import { countUsers, setSetting } from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getMigrations } from 'better-auth/db/migration';
import { getAuth } from '../auth.ts';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, RpcStatus } from '../errors.ts';
import { errorSchema, setupSchema } from '../schemas.ts';

export function setupRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/setup',
      tags: ['Setup'],
      security: [],
      responses: {
        200: {
          description: 'Reports whether the owner account exists.',
          content: { 'application/json': { schema: setupSchema } },
        },
      },
    }),
    async (c) => {
      const initialized = await isInitialized();
      return c.json({ initialized }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/setup:initialize',
      tags: ['Setup'],
      security: [],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                email: z.string().email(),
                password: z.string().min(8),
                displayName: z.string().min(1),
                siteName: z.string().min(1),
                siteDescription: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Creates the owner account.',
          content: { 'application/json': { schema: setupSchema } },
        },
        400: {
          description: 'Already initialized.',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      if (await isInitialized()) {
        throw new ApiError(
          RpcStatus.FAILED_PRECONDITION,
          'TrustFall is already initialized.',
        );
      }

      const auth = await getAuth();
      try {
        const migrations = await getMigrations(auth.options);
        if (migrations.toBeCreated.length > 0 || migrations.toBeAdded.length > 0) {
          await migrations.runMigrations();
        }
      } catch (error) {
        console.warn('Better Auth getMigrations skipped', error);
      }

      const body = c.req.valid('json');
      await auth.api.createUser({
        body: {
          email: body.email,
          password: body.password,
          name: body.displayName,
          role: 'admin',
        },
      });
      await setSetting(db(), 'siteName', body.siteName);
      await setSetting(db(), 'siteDescription', body.siteDescription ?? '');

      return c.json({ initialized: true }, 200);
    },
  );

  return app;
}

async function isInitialized(): Promise<boolean> {
  try {
    return (await countUsers(db())) > 0;
  } catch {
    return false;
  }
}
