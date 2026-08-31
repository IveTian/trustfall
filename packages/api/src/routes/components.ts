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
  setComponentStatus,
  updateComponent,
  updateComponentGroup,
} from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { ComponentStatus } from '@trustfall/shared';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, RpcStatus } from '../errors.ts';
import { presentComponent, presentGroup } from '../presenters.ts';
import {
  componentGroupSchema,
  componentSchema,
  componentStatusSchema,
  errorSchema,
  parseResourceId,
  resourceIdFromCustomMethod,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';
import { applyUpdateMask } from '../update-mask.ts';

const idParam = z.object({
  component: z.string(),
});

const groupIdParam = z.object({
  componentGroup: z.string(),
});

const listQuery = z.object({
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  pageToken: z.string().optional(),
});

export function componentRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/componentGroups',
      tags: ['Component groups'],
      security: [],
      request: { query: listQuery },
      responses: {
        200: {
          description: 'Lists component groups.',
          content: {
            'application/json': {
              schema: z.object({
                componentGroups: z.array(componentGroupSchema),
                nextPageToken: z.string().optional(),
              }),
            },
          },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const rows = await listComponentGroups(db());
      const page = paginate(rows, query.pageSize ?? 100, query.pageToken);
      return c.json(
        { componentGroups: page.items.map(presentGroup), nextPageToken: page.nextPageToken },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/components',
      tags: ['Components'],
      security: [],
      request: { query: listQuery },
      responses: {
        200: {
          description: 'Lists components.',
          content: {
            'application/json': {
              schema: z.object({
                components: z.array(componentSchema),
                nextPageToken: z.string().optional(),
              }),
            },
          },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const rows = await listComponents(db());
      const page = paginate(rows, query.pageSize ?? 100, query.pageToken);
      return c.json(
        { components: page.items.map(presentComponent), nextPageToken: page.nextPageToken },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/componentGroups',
      tags: ['Component groups'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                displayName: z.string().min(1),
                description: z.string().optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Creates a component group.',
          content: { 'application/json': { schema: componentGroupSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const row = await createComponentGroup(db(), body);
      return c.json(presentGroup(row), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/v1/componentGroups/{componentGroup}',
      tags: ['Component groups'],
      request: {
        params: groupIdParam,
        query: z.object({ updateMask: z.string().optional() }),
        body: {
          content: {
            'application/json': {
              schema: z.object({
                displayName: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Updates a component group.',
          content: { 'application/json': { schema: componentGroupSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const { componentGroup } = c.req.valid('param');
      const body = applyUpdateMask(c.req.valid('query').updateMask, c.req.valid('json'));
      const row = await updateComponentGroup(
        db(),
        parseResourceId(componentGroup, 'componentGroups'),
        body,
      );
      if (!row) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Component group not found.');
      }
      return c.json(presentGroup(row), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/v1/componentGroups/{componentGroup}',
      tags: ['Component groups'],
      request: { params: groupIdParam },
      responses: {
        200: {
          description: 'Deletes a component group.',
          content: { 'application/json': { schema: z.object({ name: z.string() }) } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const { componentGroup } = c.req.valid('param');
      const id = parseResourceId(componentGroup, 'componentGroups');
      const existing = await getComponentGroup(db(), id);
      if (!existing) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Component group not found.');
      }
      await deleteComponentGroup(db(), id);
      return c.json({ name: `componentGroups/${id}` }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/components',
      tags: ['Components'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                displayName: z.string().min(1),
                description: z.string().optional(),
                group: z.string().nullable().optional(),
                status: componentStatusSchema.optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Creates a component.',
          content: { 'application/json': { schema: componentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const row = await createComponent(db(), {
        displayName: body.displayName,
        description: body.description,
        groupId: body.group ? parseResourceId(body.group, 'componentGroups') : null,
        status: body.status,
        position: body.position,
      });
      return c.json(presentComponent(row), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      middleware: authMiddleware,
      path: '/v1/components/{component}',
      tags: ['Components'],
      request: {
        params: idParam,
        query: z.object({ updateMask: z.string().optional() }),
        body: {
          content: {
            'application/json': {
              schema: z.object({
                displayName: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                group: z.string().nullable().optional(),
                status: componentStatusSchema.optional(),
                position: z.number().int().optional(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Updates a component.',
          content: { 'application/json': { schema: componentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const { component } = c.req.valid('param');
      const body = applyUpdateMask(c.req.valid('query').updateMask, c.req.valid('json'));
      const row = await updateComponent(db(), parseResourceId(component, 'components'), {
        displayName: body.displayName,
        description: body.description,
        groupId: body.group === undefined ? undefined : body.group ? parseResourceId(body.group, 'componentGroups') : null,
        status: body.status,
        position: body.position,
      });
      if (!row) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Component not found.');
      }
      return c.json(presentComponent(row), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      middleware: authMiddleware,
      path: '/v1/components/{component}',
      tags: ['Components'],
      request: { params: idParam },
      responses: {
        200: {
          description: 'Deletes a component.',
          content: { 'application/json': { schema: z.object({ name: z.string() }) } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const id = parseResourceId(c.req.valid('param').component, 'components');
      const existing = await getComponent(db(), id);
      if (!existing) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Component not found.');
      }
      await deleteComponent(db(), id);
      return c.json({ name: `components/${id}` }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      middleware: authMiddleware,
      path: '/v1/components/{component}:setStatus',
      tags: ['Components'],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ status: componentStatusSchema }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Sets a component status.',
          content: { 'application/json': { schema: componentSchema } },
        },
        401: { description: 'Unauthenticated.', content: { 'application/json': { schema: errorSchema } } },
        404: { description: 'Not found.', content: { 'application/json': { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const id = resourceIdFromCustomMethod(new URL(c.req.url).pathname, 'components', 'setStatus');
      const { status } = c.req.valid('json');
      const row = await setComponentStatus(db(), id, status as ComponentStatus);
      if (!row) {
        throw new ApiError(RpcStatus.NOT_FOUND, 'Component not found.');
      }
      return c.json(presentComponent(row), 200);
    },
  );

  return app;
}
