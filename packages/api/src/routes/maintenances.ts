import {
  addMaintenanceUpdate,
  createMaintenance,
  deleteMaintenance,
  getMaintenance,
  listMaintenances,
  paginate,
  updateMaintenance,
} from '@trustfall/db';
import { isValidTimeZone, type MaintenanceRecurrence } from '@trustfall/shared';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, ProblemType } from '../errors.ts';
import { checkIfMatch, createdLocation, etagFor, ifMatchHeader, problems } from '../http.ts';
import { presentMaintenance, presentMaintenanceUpdate } from '../presenters.ts';
import {
  collectionSchema,
  maintenanceRecurrenceSchema,
  maintenanceSchema,
  maintenanceStatusSchema,
  maintenanceUpdateSchema,
  pageQuery,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';

const maintenanceParam = z.object({
  maintenance_id: z.string().openapi({
    param: { name: 'maintenance_id', in: 'path' },
    example: 'mnt_a53d',
  }),
});

const updateParam = maintenanceParam.extend({
  update_id: z.string().openapi({ param: { name: 'update_id', in: 'path' }, example: 'mup_7b39' }),
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

/** Thirty days: long enough for any window, short enough to catch a typo. */
const MAX_DURATION_MINUTES = 30 * 24 * 60;

const durationField = z
  .number()
  .int()
  .min(1)
  .max(MAX_DURATION_MINUTES)
  .openapi({ description: 'How long each window lasts.', example: 120 });

const timeZoneField = z
  .string()
  .min(1)
  .refine(isValidTimeZone, { message: 'Unknown IANA time zone.' })
  .openapi({
    description: 'IANA zone a recurrence keeps its wall-clock time in.',
    example: 'Asia/Shanghai',
  });

function parseTimestamp(value: string, name: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new ApiError(ProblemType.VALIDATION_FAILED, `${name} is not a valid timestamp.`, [
      { name, reason: 'Expected an RFC 3339 timestamp.' },
    ]);
  }
  return ms;
}

function toRecurrence(
  input: z.infer<typeof maintenanceRecurrenceSchema> | null | undefined,
): MaintenanceRecurrence | null | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (input === null) {
    return null;
  }
  return {
    frequency: input.frequency,
    interval: input.interval,
    ...(input.by_weekday
      ? { byWeekday: [...new Set(input.by_weekday)].sort((a, b) => a - b) }
      : {}),
    until: input.until == null ? null : parseTimestamp(input.until, 'recurrence.until'),
  };
}

async function loadMaintenance(id: string) {
  const maintenance = await getMaintenance(db(), id);
  if (!maintenance) {
    throw new ApiError(ProblemType.NOT_FOUND, 'Maintenance not found.');
  }
  return maintenance;
}

export function maintenanceRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/maintenances',
      tags: ['Maintenance'],
      summary: 'List maintenances',
      description:
        'Newest tracked window first, with `id` as the tie breaker. Cursor-paged. Reading also brings every window up to date with the clock.',
      security: [],
      request: {
        query: pageQuery.extend({
          state: z.enum(['ACTIVE', 'PAST']).optional().openapi({
            description:
              'Omit for every maintenance. ACTIVE is SCHEDULED or IN_PROGRESS; PAST is COMPLETED or CANCELLED.',
          }),
        }),
      },
      responses: {
        200: {
          description: 'A page of maintenances.',
          content: {
            'application/json': { schema: collectionSchema(maintenanceSchema, 'MaintenancePage') },
          },
        },
        400: problems.validationFailed,
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const result = await listMaintenances(db(), {
        pageSize: query.page_size,
        cursor: query.cursor,
        state: query.state,
      });
      return c.json(
        { items: result.maintenances.map(presentMaintenance), next_cursor: result.nextCursor },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/maintenances',
      tags: ['Maintenance'],
      summary: 'Schedule a maintenance',
      description: [
        'Creates the maintenance and its announcement, the first timeline entry.',
        'Omit `starts_at` to start right away. Add `recurrence` for a series: `starts_at` then anchors the first window and every later one repeats it on the wall clock of `time_zone`.',
        'While a window is under way, each affected component that is operational reads UNDER_MAINTENANCE; a component an incident has degraded keeps its outage.',
      ].join(' '),
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                title: z.string().min(1),
                body: z.string().min(1).openapi({ description: 'The announcement.' }),
                component_ids: z.array(z.string()).default([]),
                starts_at: timestampInput('When the first window opens. Omitted means now.'),
                duration_minutes: durationField,
                recurrence: maintenanceRecurrenceSchema.nullable().optional(),
                time_zone: timeZoneField.optional().openapi({ description: 'Defaults to UTC.' }),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The scheduled maintenance.',
          headers: locationHeader('URI of the created maintenance.'),
          content: { 'application/json': { schema: maintenanceSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        409: problems.conflict,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const maintenance = await createMaintenance(db(), {
        title: body.title,
        body: body.body,
        componentIds: body.component_ids,
        startTime: body.starts_at ? parseTimestamp(body.starts_at, 'starts_at') : undefined,
        durationMs: body.duration_minutes * 60_000,
        recurrence: toRecurrence(body.recurrence),
        timeZone: body.time_zone ?? 'UTC',
      });
      return c.json(presentMaintenance(maintenance), 201, {
        Location: createdLocation(c, maintenance.id),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/maintenances/{maintenance_id}',
      tags: ['Maintenance'],
      summary: 'Read a maintenance',
      security: [],
      request: { params: maintenanceParam },
      responses: {
        200: {
          description: 'The maintenance, with its timeline newest first.',
          headers: etagHeader,
          content: { 'application/json': { schema: maintenanceSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const maintenance = await loadMaintenance(c.req.valid('param').maintenance_id);
      return c.json(presentMaintenance(maintenance), 200, {
        ETag: etagFor(maintenance.updateTime),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/maintenances/{maintenance_id}',
      tags: ['Maintenance'],
      summary: 'Edit a maintenance',
      description: [
        'An omitted property is left unchanged. `body` rewrites the announcement.',
        'While SCHEDULED, everything may change. While IN_PROGRESS, only `title`, `body`, `component_ids` and `duration_minutes` (which moves the end of the window under way) are accepted. Once finished, only the words may change.',
        'Status moves through POST /maintenances/{maintenance_id}/updates.',
      ].join(' '),
      request: {
        params: maintenanceParam,
        headers: ifMatchHeader,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                title: z.string().min(1).optional(),
                body: z.string().min(1).optional(),
                component_ids: z.array(z.string()).optional(),
                starts_at: timestampInput('When the first window opens.'),
                duration_minutes: durationField.optional(),
                recurrence: maintenanceRecurrenceSchema
                  .nullable()
                  .optional()
                  .openapi({ description: 'Explicit `null` turns a series into a one-off.' }),
                time_zone: timeZoneField.optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'The updated maintenance.',
          headers: etagHeader,
          content: { 'application/json': { schema: maintenanceSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { maintenance_id: maintenanceId } = c.req.valid('param');
      const existing = await loadMaintenance(maintenanceId);
      checkIfMatch(c, etagFor(existing.updateTime));
      const body = c.req.valid('json');
      const maintenance = await updateMaintenance(db(), maintenanceId, {
        title: body.title,
        body: body.body,
        componentIds: body.component_ids,
        startTime: body.starts_at ? parseTimestamp(body.starts_at, 'starts_at') : undefined,
        durationMs:
          body.duration_minutes === undefined ? undefined : body.duration_minutes * 60_000,
        recurrence: toRecurrence(body.recurrence),
        timeZone: body.time_zone,
      });
      if (!maintenance) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Maintenance not found.');
      }
      return c.json(presentMaintenance(maintenance), 200, {
        ETag: etagFor(maintenance.updateTime),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/maintenances/{maintenance_id}',
      tags: ['Maintenance'],
      summary: 'Delete a maintenance',
      description:
        'For one scheduled by mistake. Calling one off that readers have seen is a CANCELLED timeline update. A window under way releases its components.',
      request: { params: maintenanceParam, headers: ifMatchHeader },
      responses: {
        204: { description: 'The maintenance is gone.' },
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { maintenance_id: maintenanceId } = c.req.valid('param');
      const existing = await loadMaintenance(maintenanceId);
      checkIfMatch(c, etagFor(existing.updateTime));
      await deleteMaintenance(db(), maintenanceId);
      return c.body(null, 204);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/maintenances/{maintenance_id}/updates',
      tags: ['Maintenance'],
      summary: 'List a maintenance timeline',
      description: 'Newest first.',
      security: [],
      request: { params: maintenanceParam, query: pageQuery },
      responses: {
        200: {
          description: 'A page of timeline entries.',
          content: {
            'application/json': {
              schema: collectionSchema(maintenanceUpdateSchema, 'MaintenanceUpdatePage'),
            },
          },
        },
        400: problems.validationFailed,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const maintenance = await loadMaintenance(c.req.valid('param').maintenance_id);
      const query = c.req.valid('query');
      const page = paginate(maintenance.updates, query.page_size, query.cursor);
      return c.json(
        { items: page.items.map(presentMaintenanceUpdate), next_cursor: page.nextCursor },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/maintenances/{maintenance_id}/updates',
      tags: ['Maintenance'],
      summary: 'Post a timeline update',
      description: [
        'How an operator moves a maintenance by hand. The current status again posts a note.',
        'IN_PROGRESS opens a SCHEDULED window early; COMPLETED closes the window under way early (a series then rolls on to its next window); CANCELLED calls the whole maintenance off.',
        'Windows also open and close on their own when their time comes; those entries carry `automatic: true`.',
      ].join(' '),
      request: {
        params: maintenanceParam,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                status: maintenanceStatusSchema,
                body: z.string().optional().openapi({
                  description:
                    'Required for a note. A transition without one gets a stock message.',
                }),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The posted update.',
          headers: locationHeader('URI of the created update.'),
          content: { 'application/json': { schema: maintenanceUpdateSchema } },
        },
        400: problems.failedPrecondition,
        401: problems.unauthenticated,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { maintenance_id: maintenanceId } = c.req.valid('param');
      const body = c.req.valid('json');
      const result = await addMaintenanceUpdate(db(), maintenanceId, {
        status: body.status,
        body: body.body?.trim() || undefined,
      });
      if (!result) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Maintenance not found.');
      }
      return c.json(presentMaintenanceUpdate(result.update), 201, {
        Location: createdLocation(c, result.update.id),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/maintenances/{maintenance_id}/updates/{update_id}',
      tags: ['Maintenance'],
      summary: 'Read a timeline update',
      security: [],
      request: { params: updateParam },
      responses: {
        200: {
          description: 'The update.',
          content: { 'application/json': { schema: maintenanceUpdateSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { maintenance_id: maintenanceId, update_id: updateId } = c.req.valid('param');
      const maintenance = await loadMaintenance(maintenanceId);
      const update = maintenance.updates.find((row) => row.id === updateId);
      if (!update) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Maintenance update not found.');
      }
      return c.json(presentMaintenanceUpdate(update), 200);
    },
  );

  return app;
}

function timestampInput(description: string) {
  return z.string().optional().openapi({
    description,
    format: 'date-time',
    example: '2026-09-06T02:00:00Z',
  });
}
