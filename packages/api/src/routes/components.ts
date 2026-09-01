import {
  createComponent,
  createComponentGroup,
  deleteComponent,
  deleteComponentGroup,
  getComponent,
  getComponentGroup,
  listComponentGroups,
  listComponents,
  paginate,
  updateComponent,
  updateComponentGroup,
} from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, ProblemType } from '../errors.ts';
import { checkIfMatch, createdLocation, etagFor, ifMatchHeader, problems } from '../http.ts';
import { presentComponent, presentGroup } from '../presenters.ts';
import {
  collectionSchema,
  componentGroupSchema,
  componentSchema,
  componentStatusSchema,
  pageQuery,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';

const groupParam = z.object({
  group_id: z.string().openapi({ param: { name: 'group_id', in: 'path' }, example: 'grp_4c81' }),
});

const componentParam = z.object({
  component_id: z.string().openapi({
    param: { name: 'component_id', in: 'path' },
    example: 'cmp_1f0a',
  }),
});

const etagHeader = {
  ETag: {
    description: 'Pass back as `If-Match` on a write to reject a stale update.',
    schema: { type: 'string' as const },
  },
};

/**
 * PATCH semantics for both collections: an omitted property is left unchanged,
 * an explicit `null` clears a nullable one. There is no update mask — the body
 * says everything the server needs to know.
 */
export function componentRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/component-groups',
      tags: ['Component groups'],
      summary: 'List component groups',
      description: 'Ordered by `position` ascending. Offset-paged; the collection is small.',
      security: [],
      request: { query: pageQuery },
      responses: {
        200: {
          description: 'A page of component groups.',
          content: {
            'application/json': {
              schema: collectionSchema(componentGroupSchema, 'ComponentGroupPage'),
            },
          },
        },
        400: problems.validationFailed,
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const rows = await listComponentGroups(db());
      const page = paginate(rows, query.page_size, query.cursor);
      return c.json({ items: page.items.map(presentGroup), next_cursor: page.nextCursor }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/component-groups',
      tags: ['Component groups'],
      summary: 'Create a component group',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                display_name: z.string().min(1),
                description: z.string().optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The created group.',
          headers: {
            Location: {
              description: 'URI of the created group.',
              schema: { type: 'string' as const },
            },
          },
          content: { 'application/json': { schema: componentGroupSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        409: problems.conflict,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const row = await createComponentGroup(db(), {
        displayName: body.display_name,
        description: body.description,
        position: body.position,
      });
      return c.json(presentGroup(row), 201, { Location: createdLocation(c, row.id) });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/component-groups/{group_id}',
      tags: ['Component groups'],
      summary: 'Read a component group',
      security: [],
      request: { params: groupParam },
      responses: {
        200: {
          description: 'The group.',
          headers: etagHeader,
          content: { 'application/json': { schema: componentGroupSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const row = await getComponentGroup(db(), c.req.valid('param').group_id);
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component group not found.');
      }
      return c.json(presentGroup(row), 200, { ETag: etagFor(row.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/component-groups/{group_id}',
      tags: ['Component groups'],
      summary: 'Update a component group',
      request: {
        params: groupParam,
        headers: ifMatchHeader,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                display_name: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'The updated group.',
          headers: etagHeader,
          content: { 'application/json': { schema: componentGroupSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { group_id: groupId } = c.req.valid('param');
      const body = c.req.valid('json');
      const existing = await getComponentGroup(db(), groupId);
      if (!existing) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component group not found.');
      }
      checkIfMatch(c, etagFor(existing.updateTime));
      const row = await updateComponentGroup(db(), groupId, {
        displayName: body.display_name,
        description: body.description,
        position: body.position,
      });
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component group not found.');
      }
      return c.json(presentGroup(row), 200, { ETag: etagFor(row.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/component-groups/{group_id}',
      tags: ['Component groups'],
      summary: 'Delete a component group',
      request: { params: groupParam, headers: ifMatchHeader },
      responses: {
        204: { description: 'The group is gone.' },
        401: problems.unauthenticated,
        404: problems.notFound,
        409: problems.conflict,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { group_id: groupId } = c.req.valid('param');
      const existing = await getComponentGroup(db(), groupId);
      if (!existing) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component group not found.');
      }
      checkIfMatch(c, etagFor(existing.updateTime));
      await deleteComponentGroup(db(), groupId);
      return c.body(null, 204);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/components',
      tags: ['Components'],
      summary: 'List components',
      description:
        'Ordered by `position` ascending, then `display_name`. Offset-paged; the collection is small.',
      security: [],
      request: {
        query: pageQuery.extend({
          group_id: z.string().optional().openapi({
            description: 'Only components in this group. Omit for every component.',
          }),
        }),
      },
      responses: {
        200: {
          description: 'A page of components.',
          content: {
            'application/json': { schema: collectionSchema(componentSchema, 'ComponentPage') },
          },
        },
        400: problems.validationFailed,
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const rows = await listComponents(db(), { groupId: query.group_id });
      const page = paginate(rows, query.page_size, query.cursor);
      return c.json({ items: page.items.map(presentComponent), next_cursor: page.nextCursor }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/components',
      tags: ['Components'],
      summary: 'Create a component',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                display_name: z.string().min(1),
                description: z.string().optional(),
                group_id: z.string().nullable().optional(),
                status: componentStatusSchema.optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The created component.',
          headers: {
            Location: {
              description: 'URI of the created component.',
              schema: { type: 'string' as const },
            },
          },
          content: { 'application/json': { schema: componentSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        409: problems.conflict,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const row = await createComponent(db(), {
        displayName: body.display_name,
        description: body.description,
        groupId: body.group_id ?? null,
        status: body.status,
        position: body.position,
      });
      return c.json(presentComponent(row), 201, { Location: createdLocation(c, row.id) });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/components/{component_id}',
      tags: ['Components'],
      summary: 'Read a component',
      security: [],
      request: { params: componentParam },
      responses: {
        200: {
          description: 'The component.',
          headers: etagHeader,
          content: { 'application/json': { schema: componentSchema } },
        },
        404: problems.notFound,
      },
    }),
    async (c) => {
      const row = await getComponent(db(), c.req.valid('param').component_id);
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component not found.');
      }
      return c.json(presentComponent(row), 200, { ETag: etagFor(row.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/components/{component_id}',
      tags: ['Components'],
      summary: 'Update a component',
      description:
        'Also how an operator declares a new status: send `{ "status": "MAJOR_OUTAGE" }`.',
      request: {
        params: componentParam,
        headers: ifMatchHeader,
        body: {
          content: {
            'application/json': {
              schema: z.object({
                display_name: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                group_id: z.string().nullable().optional(),
                status: componentStatusSchema.optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'The updated component.',
          headers: etagHeader,
          content: { 'application/json': { schema: componentSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
        404: problems.notFound,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { component_id: componentId } = c.req.valid('param');
      const body = c.req.valid('json');
      const existing = await getComponent(db(), componentId);
      if (!existing) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component not found.');
      }
      checkIfMatch(c, etagFor(existing.updateTime));
      const row = await updateComponent(db(), componentId, {
        displayName: body.display_name,
        description: body.description,
        groupId: body.group_id,
        status: body.status,
        position: body.position,
      });
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component not found.');
      }
      return c.json(presentComponent(row), 200, { ETag: etagFor(row.updateTime) });
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/components/{component_id}',
      tags: ['Components'],
      summary: 'Delete a component',
      request: { params: componentParam, headers: ifMatchHeader },
      responses: {
        204: { description: 'The component is gone.' },
        401: problems.unauthenticated,
        404: problems.notFound,
        409: problems.conflict,
        412: problems.preconditionFailed,
      },
    }),
    async (c) => {
      const { component_id: componentId } = c.req.valid('param');
      const existing = await getComponent(db(), componentId);
      if (!existing) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Component not found.');
      }
      checkIfMatch(c, etagFor(existing.updateTime));
      await deleteComponent(db(), componentId);
      return c.body(null, 204);
    },
  );

  return app;
}
