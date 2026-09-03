import {
  addIncidentUpdate,
  createIncident,
  deleteIncident,
  getIncident,
  listIncidents,
  paginate,
  updateIncident,
} from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, ProblemType } from '../errors.ts';
import { checkIfMatch, createdLocation, etagFor, ifMatchHeader, problems } from '../http.ts';
import { presentIncident, presentUpdate } from '../presenters.ts';
import {
  collectionSchema,
  componentStatusSchema,
  incidentImpactSchema,
  incidentSchema,
  incidentStatusSchema,
  incidentUpdateSchema,
  pageQuery,
  timestampInput,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';

const incidentParam = z.object({
  incident_id: z.string().openapi({
    param: { name: 'incident_id', in: 'path' },
    example: 'inc_a53d',
  }),
});

const updateParam = incidentParam.extend({
  update_id: z.string().openapi({ param: { name: 'update_id', in: 'path' }, example: 'upd_7b39' }),
});

const etagHeader = {
  ETag: {
    description: 'Pass back as `If-Match` on a write to reject a stale update.',
    schema: { type: 'string' as const },
  },
};

const locationHeader = (description: string) => ({
  Location: { description, schema: { type: 'string' as const } },
});

/** The schema has already insisted on RFC 3339; this only turns it into ms. */
function parseTimestamp(value: string, name: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new ApiError(ProblemType.VALIDATION_FAILED, `${name} is not a valid timestamp.`, [
      { name, reason: 'Expected an RFC 3339 timestamp.' },
    ]);
  }
  return ms;
}

async function loadIncident(id: string) {
  const incident = await getIncident(db(), id);
  if (!incident) {
    throw new ApiError(ProblemType.NOT_FOUND, 'Incident not found.');
  }
  return incident;
}

export function incidentRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/incidents',
      tags: ['Incidents'],
      summary: 'List incidents',
      description:
        'Newest first by `started_at`, with `id` as the tie breaker. Cursor-paged: incidents are opened while a reader pages through, and an offset would make it skip one.',
      security: [],
      request: {
        query: pageQuery.extend({
          state: z.enum(['ACTIVE', 'RESOLVED']).optional().openapi({
            description: 'Omit for every incident. ACTIVE is everything not yet resolved.',
          }),
        }),
      },
      responses: {
        200: {
          description: 'A page of incidents.',
          content: {
            'application/json': { schema: collectionSchema(incidentSchema, 'IncidentPage') },
          },
        },
        400: problems.validationFailed,
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const result = await listIncidents(db(), {
        pageSize: query.page_size,
        cursor: query.cursor,
        state: query.state,
      });
      return c.json(
        { items: result.incidents.map(presentIncident), next_cursor: result.nextCursor },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/incidents',
      tags: ['Incidents'],
      summary: 'Open an incident',
      description:
        'Creates the incident and its first timeline entry, and moves every affected component to its declared status (partial outage when none is given). Omit `started_at` to begin at the moment of publishing; send it to backdate the start.',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                title: z.string().min(1),
                impact: incidentImpactSchema,
                body: z.string().min(1).openapi({ description: 'The first timeline entry.' }),
                status: incidentStatusSchema.optional().openapi({
                  description: 'Defaults to INVESTIGATING.',
                }),
                started_at: timestampInput(
                  'When the incident began. Omit to start at the moment of publishing. Must be now or in the past.',
                ).optional(),
                component_ids: z.array(z.string()).default([]),
                component_statuses: z.record(z.string(), componentStatusSchema).optional().openapi({
                  description:
                    'Status per affected component id; an omitted component falls back to PARTIAL_OUTAGE.',
                }),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The opened incident.',
          headers: locationHeader('URI of the created incident.'),
          content: { 'application/json': { schema: incidentSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        409: problems.conflict,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const startTime = body.started_at ? parseTimestamp(body.started_at, 'started_at') : undefined;
      if (startTime != null && startTime > Date.now()) {
        throw new ApiError(ProblemType.VALIDATION_FAILED, 'started_at must not be in the future.', [
          { name: 'started_at', reason: 'Must be now or in the past.' },
        ]);
      }
      const incident = await createIncident(db(), {
        title: body.title,
        impact: body.impact,
        body: body.body,
        status: body.status,
        componentIds: body.component_ids,
        componentStatuses: body.component_statuses,
        startTime,
      });
      return c.json(presentIncident(incident), 201, {
        Location: createdLocation(c, incident.id),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/incidents/{incident_id}',
      tags: ['Incidents'],
      summary: 'Read an incident',
      security: [],
      request: { params: incidentParam },
      responses: {
        200: {
          description: 'The incident, with its timeline newest first.',
          headers: etagHeader,
          content: { 'application/json': { schema: incidentSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const incident = await loadIncident(c.req.valid('param').incident_id);
      return c.json(presentIncident(incident), 200, { ETag: etagFor(incident.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/incidents/{incident_id}',
      tags: ['Incidents'],
      summary: 'Correct an incident',
      description:
        'Edits the framing only. Status moves through POST /incidents/{incident_id}/updates, because every transition owes readers an explanation. An omitted property is left unchanged.',
      request: {
        params: incidentParam,
        headers: ifMatchHeader,
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
          description: 'The updated incident.',
          headers: etagHeader,
          content: { 'application/json': { schema: incidentSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { incident_id: incidentId } = c.req.valid('param');
      const existing = await loadIncident(incidentId);
      checkIfMatch(c, etagFor(existing.updateTime));
      const body = c.req.valid('json');
      const incident = await updateIncident(db(), incidentId, {
        title: body.title,
        impact: body.impact,
      });
      if (!incident) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentIncident(incident), 200, { ETag: etagFor(incident.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/incidents/{incident_id}',
      tags: ['Incidents'],
      summary: 'Delete an incident',
      description: 'For an incident opened by mistake. Resolving one is a timeline update.',
      request: { params: incidentParam, headers: ifMatchHeader },
      responses: {
        204: { description: 'The incident is gone.' },
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { incident_id: incidentId } = c.req.valid('param');
      const existing = await loadIncident(incidentId);
      checkIfMatch(c, etagFor(existing.updateTime));
      await deleteIncident(db(), incidentId);
      return c.body(null, 204);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/incidents/{incident_id}/updates',
      tags: ['Incidents'],
      summary: 'List an incident timeline',
      description: 'Newest first.',
      security: [],
      request: { params: incidentParam, query: pageQuery },
      responses: {
        200: {
          description: 'A page of timeline entries.',
          content: {
            'application/json': {
              schema: collectionSchema(incidentUpdateSchema, 'IncidentUpdatePage'),
            },
          },
        },
        400: problems.validationFailed,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const incident = await loadIncident(c.req.valid('param').incident_id);
      const query = c.req.valid('query');
      const page = paginate(incident.updates, query.page_size, query.cursor);
      return c.json({ items: page.items.map(presentUpdate), next_cursor: page.nextCursor }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/incidents/{incident_id}/updates',
      tags: ['Incidents'],
      summary: 'Post a timeline update',
      description:
        'The only way an incident changes status. Posting RESOLVED closes the incident and returns every affected component to operational. `component_statuses` corrects the affected set as the update lands: OPERATIONAL detaches a component, anything else attaches or re-declares it. Omit `created_at` to stamp the moment of publishing; send it to backdate. If `created_at` is earlier than the incident start, the start moves to that instant.',
      request: {
        params: incidentParam,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                status: incidentStatusSchema,
                body: z.string().min(1),
                created_at: timestampInput(
                  'When this update was posted. Omit to use the moment of publishing. Must be now or in the past. Earlier than the incident start moves the start to this instant.',
                ).optional(),
                component_statuses: z.record(z.string(), componentStatusSchema).optional(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The posted update.',
          headers: locationHeader('URI of the created update.'),
          content: { 'application/json': { schema: incidentUpdateSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { incident_id: incidentId } = c.req.valid('param');
      const body = c.req.valid('json');
      const createTime = body.created_at
        ? parseTimestamp(body.created_at, 'created_at')
        : undefined;
      if (createTime != null && createTime > Date.now()) {
        throw new ApiError(ProblemType.VALIDATION_FAILED, 'created_at must not be in the future.', [
          { name: 'created_at', reason: 'Must be now or in the past.' },
        ]);
      }
      const result = await addIncidentUpdate(db(), incidentId, {
        status: body.status,
        body: body.body,
        componentStatuses: body.component_statuses,
        createTime,
      });
      if (!result) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Incident not found.');
      }
      return c.json(presentUpdate(result.update), 201, {
        Location: createdLocation(c, result.update.id),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/incidents/{incident_id}/updates/{update_id}',
      tags: ['Incidents'],
      summary: 'Read a timeline update',
      security: [],
      request: { params: updateParam },
      responses: {
        200: {
          description: 'The update.',
          content: { 'application/json': { schema: incidentUpdateSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { incident_id: incidentId, update_id: updateId } = c.req.valid('param');
      const incident = await loadIncident(incidentId);
      const update = incident.updates.find((row) => row.id === updateId);
      if (!update) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Incident update not found.');
      }
      return c.json(presentUpdate(update), 200);
    },
  );

  return app;
}
