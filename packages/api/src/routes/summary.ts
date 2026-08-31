import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { errorSchema, summarySchema } from '../schemas.ts';
import { presentComponent, presentGroup, presentIncident } from '../presenters.ts';
import { getSummary } from '@trustfall/db';

const route = createRoute({
  method: 'get',
  path: '/v1/summary',
  tags: ['Summary'],
  security: [],
  responses: {
    200: {
      description: 'Current public status summary.',
      content: { 'application/json': { schema: summarySchema } },
    },
    500: {
      description: 'Internal error.',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

export function summaryRoutes() {
  const app = new OpenAPIHono<AppEnv>();
  app.openapi(route, async (c) => {
    const summary = await getSummary(db());
    return c.json(
      {
        name: 'summary' as const,
        overallStatus: summary.overallStatus,
        siteName: summary.siteName,
        siteDescription: summary.siteDescription,
        componentGroups: summary.componentGroups.map((group) => ({
          ...presentGroup(group),
          components: group.components.map(presentComponent),
        })),
        ungroupedComponents: summary.ungroupedComponents.map(presentComponent),
        activeIncidents: summary.activeIncidents.map(presentIncident),
      },
      200,
    );
  });
  return app;
}
