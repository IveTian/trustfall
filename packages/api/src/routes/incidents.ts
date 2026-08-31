import {
  addIncidentUpdate,
  createIncident,
  deleteIncident,
  getIncident,
  listIncidents,
  resolveIncident,
  updateIncident,
} from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, RpcStatus } from '../errors.ts';
import { presentIncident, presentUpdate } from '../presenters.ts';
import {
  errorSchema,
  incidentImpactSchema,
  incidentSchema,
  incidentStatusSchema,
  incidentUpdateSchema,
  parseResourceId,
  resourceIdFromCustomMethod,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';
import { applyUpdateMask } from '../update-mask.ts';

export function incidentRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/incidents',
      tags: ['Incidents'],
      security: [],
      request: {
        query: z.object({
          pageSize: z.coerce.number().int().min(1).max(100).optional(),
          pageToken: z.string().optional(),
          filter: z.enum(['active', 'resolved', 'all']).optional(),
        }),
      },
      responses: {
        200: {
          description: 'Lists incidents.',
          content: {
            'application/json': {
              schema: z.object({
                incidents: z.array(incidentSchema),
                nextPageToken: z.string().optional(),
              }),
            },
          },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const result = await listIncidents(db(), query);
      return c.json(
        {
          incidents: result.incidents.map(presentIncident),
          nextPageToken: result.nextPageToken,
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/incidents/{incident}',
      tags: ['Incidents'],
      security: [],
      request: { params: z.object({ incident: z.string() }) },
      responses: {
        200: {
          description: 'Gets an incident.',
          content: { 'application/json': { schema: incidentSchema } },
        },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const incident = await getIncident(
        db(),
        parseResourceId(c.req.valid('param').incident, 'incidents'),
      );
      if (!incident) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentIncident(incident), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/incidents/{incident}/updates',
      tags: ['Incidents'],
      security: [],
      request: { params: z.object({ incident: z.string() }) },
      responses: {
        200: {
          description: 'Lists incident updates.',
          content: {
            'application/json': {
              schema: z.object({ updates: z.array(incidentUpdateSchema) }),
            },
          },
        },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const id = parseResourceId(c.req.valid('param').incident, 'incidents');
      const incident = await getIncident(db(), id);
      if (!incident) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      return c.json(
        { updates: incident.updates.map((update) => presentUpdate(update, id)) },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/incidents',
      tags: ['Incidents'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                title: z.string().min(1),
                impact: incidentImpactSchema,
                body: z.string().min(1),
                status: incidentStatusSchema.optional(),
                componentIds: z.array(z.string()).default([]),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Creates an incident.',
          content: { 'application/json': { schema: incidentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const incident = await createIncident(db(), {
        title: body.title,
        impact: body.impact,
        body: body.body,
        status: body.status,
        componentIds: body.componentIds.map((id) => parseResourceId(id, 'components')),
      });
      return c.json(presentIncident(incident), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/v1/incidents/{incident}',
      tags: ['Incidents'],
      request: {
        params: z.object({ incident: z.string() }),
        query: z.object({ updateMask: z.string().optional() }),
        body: {
          content: {
            'application/json': {
              schema: z.object({
                title: z.string().min(1).optional(),
                impact: incidentImpactSchema.optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Updates an incident.',
          content: { 'application/json': { schema: incidentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const body = applyUpdateMask(c.req.valid('query').updateMask, c.req.valid('json'));
      const incident = await updateIncident(
        db(),
        parseResourceId(c.req.valid('param').incident, 'incidents'),
        body,
      );
      if (!incident) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentIncident(incident), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/v1/incidents/{incident}',
      tags: ['Incidents'],
      request: { params: z.object({ incident: z.string() }) },
      responses: {
        200: {
          description: 'Deletes an incident.',
          content: { 'application/json': { schema: z.object({ name: z.string() }) } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const id = parseResourceId(c.req.valid('param').incident, 'incidents');
      const existing = await getIncident(db(), id);
      if (!existing) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      await deleteIncident(db(), id);
      return c.json({ name: `incidents/${id}` }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/incidents/{incident}/updates',
      tags: ['Incidents'],
      request: {
        params: z.object({ incident: z.string() }),
        body: {
          content: {
            'application/json': {
              schema: z.object({
                status: incidentStatusSchema,
                body: z.string().min(1),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Posts an incident update.',
          content: { 'application/json': { schema: incidentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const incident = await addIncidentUpdate(
        db(),
        parseResourceId(c.req.valid('param').incident, 'incidents'),
        c.req.valid('json'),
      );
      if (!incident) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentIncident(incident), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/incidents/{incident}:resolve',
      tags: ['Incidents'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ body: z.string().optional() }),
            },
          },
          required: false,
        },
      },
      responses: {
        200: {
          description: 'Resolves an incident.',
          content: { 'application/json': { schema: incidentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      let body: { body?: string } = {};
      try {
        body = await c.req.json();
      } catch {
        body = {};
      }
      const incident = await resolveIncident(
        db(),
        resourceIdFromCustomMethod(new URL(c.req.url).pathname, 'incidents', 'resolve'),
        body.body,
      );
      if (!incident) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentIncident(incident), 200);
    },
  );

  return app;
}
