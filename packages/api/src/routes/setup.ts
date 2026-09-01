import { isSiteInitialized, setSetting } from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getMigrations } from 'better-auth/db/migration';
import { getAuth } from '../auth.ts';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, ProblemType } from '../errors.ts';
import { problems } from '../http.ts';
import { setupSchema } from '../schemas.ts';

/**
 * Setup is a singleton resource, and creating it is the one genuinely
 * retry-sensitive call in this API: it creates the owner account. A repeat
 * request cannot create a second owner — it is refused with 409 and
 * `/problems/already-initialized`, which is also the answer a client should
 * treat as success after a timeout.
 */
export function setupRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/setup',
      tags: ['Setup'],
      summary: 'Check whether the site is initialized',
      security: [],
      responses: {
        200: {
          description: 'Whether the owner account exists.',
          content: { 'application/json': { schema: setupSchema } },
        },
      },
    }),
    async (c) => c.json({ initialized: await isSiteInitialized(db()) }, 200),
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/setup',
      tags: ['Setup'],
      summary: 'Initialize the site',
      description: 'Creates the owner account and names the site. Sign-up stays closed after this.',
      security: [],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                email: z.email(),
                password: z.string().min(8),
                display_name: z.string().min(1),
                site_name: z.string().min(1),
                site_description: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The site is initialized.',
          headers: {
            Location: {
              description: 'URI of the setup resource.',
              schema: { type: 'string' as const },
            },
          },
          content: { 'application/json': { schema: setupSchema } },
        },
        400: problems.validationFailed,
        409: problems.conflict,
      },
    }),
    async (c) => {
      if (await isSiteInitialized(db())) {
        throw new ApiError(
          ProblemType.ALREADY_INITIALIZED,
          'TrustFall is already initialized. Sign in instead.',
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
          name: body.display_name,
          role: 'admin',
        },
      });
      await setSetting(db(), 'siteName', body.site_name);
      await setSetting(db(), 'siteDescription', body.site_description ?? '');

      return c.json({ initialized: true }, 201, {
        Location: new URL(c.req.url).pathname,
      });
    },
  );

  return app;
}
