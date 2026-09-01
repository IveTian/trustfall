import { getSetting, setSetting } from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { problems } from '../http.ts';
import { settingsSchema } from '../schemas.ts';
import { authMiddleware } from '../session.ts';

async function readSettings() {
  const [siteName, siteDescription] = await Promise.all([
    getSetting(db(), 'siteName'),
    getSetting(db(), 'siteDescription'),
  ]);
  return { site_name: siteName ?? 'TrustFall', site_description: siteDescription ?? '' };
}

/** A singleton: there is one site, so `/settings` is the resource itself. */
export function settingsRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/settings',
      tags: ['Settings'],
      summary: 'Read site settings',
      middleware: authMiddleware,
      responses: {
        200: {
          description: 'The site settings.',
          content: { 'application/json': { schema: settingsSchema } },
        },
        401: problems.unauthenticated,
      },
    }),
    async (c) => c.json(await readSettings(), 200),
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/settings',
      tags: ['Settings'],
      summary: 'Update site settings',
      description: 'An omitted property is left unchanged.',
      middleware: authMiddleware,
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                site_name: z.string().min(1).optional(),
                site_description: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'The updated settings.',
          content: { 'application/json': { schema: settingsSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      if (body.site_name !== undefined) {
        await setSetting(db(), 'siteName', body.site_name);
      }
      if (body.site_description !== undefined) {
        await setSetting(db(), 'siteDescription', body.site_description);
      }
      return c.json(await readSettings(), 200);
    },
  );

  return app;
}
