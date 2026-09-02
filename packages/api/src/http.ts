import { z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { ApiError, ProblemType } from './errors.ts';
import { problemSchema } from './schemas.ts';

/** Renders any failure as the one error media type this API speaks. */
export function respondWithProblem(c: Context, error: ApiError) {
  return c.json(error.toProblem(new URL(c.req.url).pathname), error.httpStatus as 400, {
    'Content-Type': 'application/problem+json',
  });
}

/**
 * Entity tag for a row, derived from its update timestamp.
 *
 * Strong rather than weak: `If-Match` is defined to compare strongly, so a weak
 * tag would never match and every conditional write would fail. The tag changes
 * on every write because `updateTime` does.
 */
export function etagFor(updatedAtMs: number): string {
  return `"${updatedAtMs.toString(36)}"`;
}

/**
 * Optimistic concurrency. `If-Match` is optional — a caller that does not send
 * it keeps last-write-wins — but a caller that does send a stale tag is
 * rejected instead of silently overwriting a newer edit. Two operators editing
 * the same incident during an outage is exactly when that matters.
 */
export function checkIfMatch(c: Context, currentEtag: string): void {
  const header = c.req.header('if-match');
  if (!header) {
    return;
  }
  const matches = header
    .split(',')
    .map((tag) => tag.trim())
    .some((tag) => tag === '*' || tag === currentEtag);
  if (!matches) {
    throw new ApiError(
      ProblemType.PRECONDITION_FAILED,
      'The resource changed since you read it. Fetch it again and retry.',
    );
  }
}

export const ifMatchHeader = z.object({
  'if-match': z
    .string()
    .optional()
    .openapi({
      param: { in: 'header' },
      description:
        'Entity tag from a previous read. Optional; when sent and stale the write is refused with 412 instead of overwriting a newer edit.',
    }),
});

/** Absolute-path URI of a resource created under the collection being posted to. */
export function createdLocation(c: Context, id: string): string {
  const { pathname } = new URL(c.req.url);
  return `${pathname.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
}

function problem(description: string) {
  return { description, content: { 'application/problem+json': { schema: problemSchema } } };
}

/** Shared OpenAPI response bodies, so one error contract covers every route. */
export const problems = {
  validationFailed: problem('The request failed validation. See `invalid_params`.'),
  unauthenticated: problem('Authentication is required.'),
  notFound: problem('The resource does not exist.'),
  conflict: problem('The request conflicts with the current state of the resource.'),
  failedPrecondition: problem('The resource exists but cannot be used in its current state.'),
  preconditionFailed: problem('`If-Match` did not match; the resource changed.'),
};
