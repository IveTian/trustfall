import { getSummary } from '@trustfall/db';
import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import {
  presentComponent,
  presentGroup,
  presentIncident,
  presentMaintenance,
} from '../presenters.ts';
import { statusSchema } from '../schemas.ts';

/**
 * The whole public page in one read. It exists because that page needs every
 * component and every open incident together, and three round trips to render
 * "is it up?" is two too many.
 */
const route = createRoute({
  method: 'get',
  path: '/status',
  tags: ['Status'],
  summary: 'Read the current status snapshot',
  security: [],
  responses: {
    200: {
      description: 'The public status snapshot.',
      content: { 'application/json': { schema: statusSchema } },
    },
  },
});

export function statusRoutes() {
  const app = new OpenAPIHono<AppEnv>();
  app.openapi(route, async (c) => {
    const summary = await getSummary(db());
    return c.json(
      {
        overall_status: summary.overallStatus,
        site_name: summary.siteName,
        site_description: summary.siteDescription,
        component_groups: summary.componentGroups.map((group) => ({
          ...presentGroup(group),
          components: group.components.map(presentComponent),
        })),
        ungrouped_components: summary.ungroupedComponents.map(presentComponent),
        active_incidents: summary.activeIncidents.map(presentIncident),
        active_maintenances: summary.activeMaintenances.map(presentMaintenance),
      },
      200,
    );
  });
  return app;
}
