import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { getAuth } from './auth.ts';
import type { AppEnv } from './env.ts';
import { ApiError, invalidParamsFromIssues, mapDatabaseError, ProblemType } from './errors.ts';
import { respondWithProblem } from './http.ts';
import { componentRoutes } from './routes/components.ts';
import { incidentRoutes } from './routes/incidents.ts';
import { settingsRoutes } from './routes/settings.ts';
import { setupRoutes } from './routes/setup.ts';
import { statusRoutes } from './routes/status.ts';

export const api = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return respondWithProblem(
        c,
        new ApiError(
          ProblemType.VALIDATION_FAILED,
          'The request is not valid.',
          invalidParamsFromIssues(result.error.issues),
        ),
      );
    }
  },
});

api.onError((err, c) => {
  if (err instanceof ApiError) {
    return respondWithProblem(c, err);
  }
  // A constraint the caller can fix must not be reported as a server fault.
  const mapped = mapDatabaseError(err);
  if (mapped) {
    return respondWithProblem(c, mapped);
  }
  console.error(err);
  return respondWithProblem(
    c,
    new ApiError(ProblemType.INTERNAL_ERROR, 'Something went wrong on our side.'),
  );
});

api.all('/auth/*', async (c) => {
  const auth = await getAuth();
  return auth.handler(c.req.raw);
});

api.route('/', statusRoutes());
api.route('/', componentRoutes());
api.route('/', incidentRoutes());
api.route('/', settingsRoutes());
api.route('/', setupRoutes());

api.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'TrustFall API',
    version: '1.0.0',
    description: [
      'Resource-oriented API for a manually-updated status page.',
      '',
      'Conventions:',
      '- JSON properties and query parameters are `snake_case`; enum values are `UPPER_SNAKE_CASE`.',
      '- Identifiers are opaque. Do not parse them.',
      '- Timestamps are RFC 3339 in UTC.',
      '- Collections are objects with `items` and an optional `next_cursor`, never bare arrays.',
      '- Failures are RFC 9457 problem documents (`application/problem+json`). Branch on `type`.',
      '- PATCH leaves omitted properties unchanged; an explicit `null` clears a nullable one.',
      '- Reads return an `ETag`; sending it back as `If-Match` on a write rejects a stale update.',
      '- Responses are open for extension: ignore properties and enum values you do not know.',
      '',
      'There is no version in the URL. The contract evolves compatibly; anything that cannot',
      'will be introduced alongside its predecessor and deprecated with `Deprecation` and',
      '`Sunset` headers before removal.',
    ].join('\n'),
    license: { name: 'AGPL-3.0-or-later' },
  },
  servers: [{ url: '/api', description: 'This deployment.' }],
  security: [{ sessionCookie: [] }],
  tags: [
    { name: 'Status', description: 'The public snapshot behind the status page.' },
    { name: 'Components', description: 'The services whose health the page reports.' },
    { name: 'Component groups', description: 'How components are grouped on the page.' },
    { name: 'Incidents', description: 'Incidents and their timelines.' },
    { name: 'Settings', description: 'Site-wide settings.' },
    { name: 'Setup', description: 'First-run initialization.' },
  ],
});

/**
 * Reads and writes are separated by authentication, not by scopes: this API has
 * exactly two callers, anonymous visitors and the signed-in operator. Routes
 * that declare `security: []` are the public half of the contract.
 */
api.openAPIRegistry.registerComponent('securitySchemes', 'sessionCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
});

api.get('/docs', Scalar({ url: '/api/openapi.json', theme: 'kepler' }));
