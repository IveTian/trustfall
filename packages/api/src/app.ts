import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { getAuth } from './auth.ts';
import type { AppEnv } from './env.ts';
import { ApiError, errorBody, RpcStatus } from './errors.ts';
import { componentRoutes } from './routes/components.ts';
import { incidentRoutes } from './routes/incidents.ts';
import { settingsRoutes } from './routes/settings.ts';
import { setupRoutes } from './routes/setup.ts';
import { summaryRoutes } from './routes/summary.ts';

export const api = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const error = new ApiError(RpcStatus.INVALID_ARGUMENT, 'Request is not valid.', [
        result.error,
      ]);
      return c.json(errorBody(error), error.httpStatus as 400);
    }
  },
});

api.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(errorBody(err), err.httpStatus as 400);
  }
  console.error(err);
  const error = new ApiError(RpcStatus.INTERNAL, 'Internal error.');
  return c.json(errorBody(error), 500);
});

api.all('/auth/*', async (c) => {
  const auth = await getAuth();
  return auth.handler(c.req.raw);
});

api.route('/', summaryRoutes());
api.route('/', componentRoutes());
api.route('/', incidentRoutes());
api.route('/', settingsRoutes());
api.route('/', setupRoutes());

api.doc31('/v1/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'TrustFall API',
    version: 'v1',
    description: 'Resource-oriented API for a manually-updated status page.',
  },
  security: [{ sessionCookie: [] }],
});

api.openAPIRegistry.registerComponent('securitySchemes', 'sessionCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
});

api.get('/docs', Scalar({ url: '/api/v1/openapi.json', theme: 'kepler' }));
