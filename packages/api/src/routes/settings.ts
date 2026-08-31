import { getSetting, setSetting } from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { errorSchema, settingsSchema } from '../schemas.ts';
import { authMiddleware } from '../session.ts';
import { applyUpdateMask } from '../update-mask.ts';

export function settingsRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/settings',
      tags: ['Settings'],
      middleware: authMiddleware,
      responses: {
        200: {
          description: 'Gets site settings.',
          content: { 'application/json': { schema: settingsSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const [siteName, siteDescription] = await Promise.all([
        getSetting(db(), 'siteName'),
        getSetting(db(), 'siteDescription'),
      ]);
      return c.json(
        {
          name: 'settings' as const,
          siteName: siteName ?? 'TrustFall',
          siteDescription: siteDescription ?? '',
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/settings',
      tags: ['Settings'],
      middleware: authMiddleware,
      request: {
        query: z.object({ updateMask: z.string().optional() }),
        body: {
          content: {
            'application/json': {
              schema: z.object({
                siteName: z.string().min(1).optional(),
                siteDescription: z.string().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Updates site settings.',
          content: { 'application/json': { schema: settingsSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const body = applyUpdateMask(c.req.valid('query').updateMask, c.req.valid('json'));
      if (body.siteName) {
        await setSetting(db(), 'siteName', body.siteName);
      }
      if (body.siteDescription !== undefined) {
        await setSetting(db(), 'siteDescription', body.siteDescription);
      }
      const [siteName, siteDescription] = await Promise.all([
        getSetting(db(), 'siteName'),
        getSetting(db(), 'siteDescription'),
      ]);
      return c.json(
        {
          name: 'settings' as const,
          siteName: siteName ?? 'TrustFall',
          siteDescription: siteDescription ?? '',
        },
        200,
      );
    },
  );

  return app;
}
