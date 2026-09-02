import {
  consumeInviteLinkByToken,
  createInviteLink,
  getInviteLink,
  getInviteLinkByToken,
  inviteLinkState,
  listInviteLinks,
  paginate,
  releaseInviteLinkSlot,
  revokeInviteLink,
} from '@trustfall/db';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { getAuth } from '../auth.ts';
import { db } from '../bindings.ts';
import type { AppEnv } from '../env.ts';
import { ApiError, ProblemType } from '../errors.ts';
import { createdLocation, problems } from '../http.ts';
import { presentInviteLink, presentPublicInvite } from '../presenters.ts';
import {
  collectionSchema,
  inviteLinkSchema,
  pageQuery,
  publicInviteSchema,
  registrationSchema,
} from '../schemas.ts';
import { authMiddleware } from '../session.ts';

const MAX_INVITE_USES = 10_000;

const inviteLinkParam = z.object({
  invite_link_id: z.string().openapi({
    param: { name: 'invite_link_id', in: 'path' },
    example: 'inv_1f0a',
  }),
});

function publicOrigin(c: Context<AppEnv>): string {
  const configured = c.env.BETTER_AUTH_URL?.replace(/\/$/, '');
  if (configured) {
    return configured;
  }
  const origin = c.req.header('origin');
  if (origin) {
    return origin;
  }
  return new URL(c.req.url).origin;
}

function unusableInvite(state: ReturnType<typeof inviteLinkState>): never {
  const detail =
    state === 'REVOKED'
      ? 'This invite link has been revoked.'
      : 'This invite link has no remaining uses.';
  throw new ApiError(ProblemType.FAILED_PRECONDITION, detail);
}

function mapCreateUserError(error: unknown): ApiError {
  const mapped = error as { status?: number; statusCode?: number; body?: { message?: string } };
  const status = mapped.status ?? mapped.statusCode;
  const message =
    mapped.body?.message ||
    (error instanceof Error ? error.message : 'Could not create the account.');
  if (status === 422 || status === 409 || /already exists/i.test(message)) {
    return new ApiError(ProblemType.ALREADY_EXISTS, 'An account with this email already exists.');
  }
  if (status === 400 || /password/i.test(message)) {
    return new ApiError(ProblemType.VALIDATION_FAILED, message, [
      { name: 'password', reason: message },
    ]);
  }
  return new ApiError(ProblemType.INTERNAL_ERROR, 'Could not create the account.');
}

/**
 * Invite links are the only way to create accounts after setup. Public
 * `/sign-up/email` stays closed (`emailAndPassword.disableSignUp`); registration
 * here calls Better Auth's admin `createUser`, the same API setup uses for the
 * owner.
 */
export function inviteLinkRoutes() {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: 'get',
      path: '/invite-links/preview',
      tags: ['Invite links'],
      summary: 'Preview a public invite link',
      description: 'Unauthenticated. Returns whether the token can still be used to register.',
      security: [],
      request: {
        query: z.object({
          token: z.string().min(1).openapi({
            description: 'The secret from the invite URL.',
          }),
        }),
      },
      responses: {
        200: {
          description: 'Whether the invite can still be used.',
          content: { 'application/json': { schema: publicInviteSchema } },
        },
        400: problems.failedPrecondition,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { token } = c.req.valid('query');
      const row = await getInviteLinkByToken(db(), token);
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Invite link not found.');
      }
      const state = inviteLinkState(row);
      if (state !== 'ACTIVE') {
        unusableInvite(state);
      }
      return c.json(presentPublicInvite(row), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/invite-links/register',
      tags: ['Invite links'],
      summary: 'Register with an invite link',
      description:
        'Creates the account through Better Auth `createUser`. Public email sign-up stays disabled.',
      security: [],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                token: z.string().min(1),
                email: z.email(),
                password: z.string().min(8),
                display_name: z.string().min(1),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The account was created. Sign in with the same email and password.',
          content: { 'application/json': { schema: registrationSchema } },
        },
        400: problems.validationFailed,
        404: problems.notFound,
        409: problems.conflict,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const existing = await getInviteLinkByToken(db(), body.token);
      if (!existing) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Invite link not found.');
      }
      const state = inviteLinkState(existing);
      if (state !== 'ACTIVE') {
        unusableInvite(state);
      }

      const consumed = await consumeInviteLinkByToken(db(), body.token);
      if (!consumed) {
        const latest = await getInviteLinkByToken(db(), body.token);
        if (!latest) {
          throw new ApiError(ProblemType.NOT_FOUND, 'Invite link not found.');
        }
        unusableInvite(inviteLinkState(latest));
      }

      const reserved = consumed;

      const auth = await getAuth();
      try {
        await auth.api.createUser({
          body: {
            email: body.email,
            password: body.password,
            name: body.display_name,
            role: 'admin',
          },
        });
      } catch (error) {
        await releaseInviteLinkSlot(db(), reserved.id);
        throw mapCreateUserError(error);
      }

      return c.json({ email: body.email, display_name: body.display_name }, 201);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/invite-links',
      tags: ['Invite links'],
      summary: 'List invite links',
      description: 'Newest first. Offset-paged; the collection is small.',
      middleware: authMiddleware,
      request: { query: pageQuery },
      responses: {
        200: {
          description: 'A page of invite links.',
          content: {
            'application/json': {
              schema: collectionSchema(inviteLinkSchema, 'InviteLinkPage'),
            },
          },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
      },
    }),
    async (c) => {
      const query = c.req.valid('query');
      const origin = publicOrigin(c);
      const rows = await listInviteLinks(db());
      const page = paginate(rows, query.page_size, query.cursor);
      return c.json(
        {
          items: page.items.map((row) => presentInviteLink(row, origin)),
          next_cursor: page.nextCursor,
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/invite-links',
      tags: ['Invite links'],
      summary: 'Generate an invite link',
      description: 'The link can create up to `max_uses` accounts, then it is spent.',
      middleware: authMiddleware,
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                max_uses: z
                  .number()
                  .int()
                  .min(1)
                  .max(MAX_INVITE_USES)
                  .openapi({
                    description: `How many people may register with this link. 1–${MAX_INVITE_USES}.`,
                    example: 1,
                  }),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: 'The generated invite link.',
          headers: {
            Location: {
              description: 'URI of the invite link.',
              schema: { type: 'string' as const },
            },
          },
          content: { 'application/json': { schema: inviteLinkSchema } },
        },
        400: problems.validationFailed,
        401: problems.unauthenticated,
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const session = c.get('session');
      if (!session) {
        throw new ApiError(ProblemType.UNAUTHENTICATED, 'Sign in to continue.');
      }
      const row = await createInviteLink(db(), {
        maxUses: body.max_uses,
        createdBy: session.user.id,
      });
      return c.json(presentInviteLink(row, publicOrigin(c)), 201, {
        Location: createdLocation(c, row.id),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/invite-links/{invite_link_id}',
      tags: ['Invite links'],
      summary: 'Read an invite link',
      middleware: authMiddleware,
      request: { params: inviteLinkParam },
      responses: {
        200: {
          description: 'The invite link.',
          content: { 'application/json': { schema: inviteLinkSchema } },
        },
        401: problems.unauthenticated,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { invite_link_id } = c.req.valid('param');
      const row = await getInviteLink(db(), invite_link_id);
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Invite link not found.');
      }
      return c.json(presentInviteLink(row, publicOrigin(c)), 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/invite-links/{invite_link_id}/revoke',
      tags: ['Invite links'],
      summary: 'Revoke an invite link',
      description: 'Idempotent. A revoked link cannot be used to register.',
      middleware: authMiddleware,
      request: { params: inviteLinkParam },
      responses: {
        200: {
          description: 'The revoked invite link.',
          content: { 'application/json': { schema: inviteLinkSchema } },
        },
        401: problems.unauthenticated,
        404: problems.notFound,
      },
    }),
    async (c) => {
      const { invite_link_id } = c.req.valid('param');
      const row = await revokeInviteLink(db(), invite_link_id);
      if (!row) {
        throw new ApiError(ProblemType.NOT_FOUND, 'Invite link not found.');
      }
      return c.json(presentInviteLink(row, publicOrigin(c)), 200);
    },
  );

  return app;
}
