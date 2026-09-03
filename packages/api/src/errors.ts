/**
 * Every failure leaves this API as an RFC 9457 problem document served as
 * `application/problem+json`.
 *
 * `type` is the stable, machine-readable half of the contract: callers branch
 * on it instead of on prose or on a bare status code, and a new problem can be
 * introduced without changing any status-code handling. It is a relative URI
 * reference on purpose — the identifier has to be stable across every
 * deployment of TrustFall, and no single hostname is.
 */

export const ProblemType = {
  VALIDATION_FAILED: '/problems/validation-failed',
  UNAUTHENTICATED: '/problems/unauthenticated',
  NOT_FOUND: '/problems/not-found',
  ALREADY_EXISTS: '/problems/already-exists',
  RESOURCE_IN_USE: '/problems/resource-in-use',
  ALREADY_INITIALIZED: '/problems/already-initialized',
  FAILED_PRECONDITION: '/problems/failed-precondition',
  PRECONDITION_FAILED: '/problems/precondition-failed',
  INTERNAL_ERROR: '/problems/internal-error',
} as const;

export type ProblemTypeUri = (typeof ProblemType)[keyof typeof ProblemType];

const PROBLEMS: Record<ProblemTypeUri, { status: number; title: string }> = {
  [ProblemType.VALIDATION_FAILED]: { status: 400, title: 'Validation failed' },
  [ProblemType.UNAUTHENTICATED]: { status: 401, title: 'Not authenticated' },
  [ProblemType.NOT_FOUND]: { status: 404, title: 'Not found' },
  [ProblemType.ALREADY_EXISTS]: { status: 409, title: 'Already exists' },
  [ProblemType.RESOURCE_IN_USE]: { status: 409, title: 'Resource in use' },
  [ProblemType.ALREADY_INITIALIZED]: { status: 409, title: 'Already initialized' },
  [ProblemType.FAILED_PRECONDITION]: { status: 400, title: 'Failed precondition' },
  [ProblemType.PRECONDITION_FAILED]: { status: 412, title: 'Precondition failed' },
  [ProblemType.INTERNAL_ERROR]: { status: 500, title: 'Internal error' },
};

/** One field-level cause, named by its JSON path in the request. */
export type InvalidParam = { name: string; reason: string };

export type Problem = {
  type: ProblemTypeUri;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalid_params?: InvalidParam[];
};

export class ApiError extends Error {
  readonly type: ProblemTypeUri;
  readonly title: string;
  readonly httpStatus: number;
  readonly invalidParams: InvalidParam[];

  constructor(type: ProblemTypeUri, detail: string, invalidParams: InvalidParam[] = []) {
    super(detail);
    this.name = 'ApiError';
    this.type = type;
    this.title = PROBLEMS[type].title;
    this.httpStatus = PROBLEMS[type].status;
    this.invalidParams = invalidParams;
  }

  toProblem(instance?: string): Problem {
    return {
      type: this.type,
      title: this.title,
      status: this.httpStatus,
      detail: this.message,
      ...(instance ? { instance } : {}),
      ...(this.invalidParams.length > 0 ? { invalid_params: this.invalidParams } : {}),
    };
  }
}

/**
 * Structurally typed rather than imported from zod: the issues arrive from
 * whichever zod copy `@hono/zod-openapi` resolved, and a version skew there
 * should not break this file.
 */
type IssueLike = { path?: readonly PropertyKey[]; message: string };

export function invalidParamsFromIssues(issues: readonly IssueLike[]): InvalidParam[] {
  return issues.map((issue) => ({
    name: issue.path?.map(String).join('.') || 'body',
    reason: issue.message,
  }));
}

/**
 * Turns a D1 constraint failure into a problem.
 *
 * D1 reports constraint violations as opaque `D1_ERROR: FOREIGN KEY constraint
 * failed` strings. Without this they reach the app's onError handler and are
 * reported as a 500, which is wrong (the caller can fix it) and unhelpful.
 * Schema growth adds dozens of RESTRICT constraints, so every write path routes
 * its failures through here.
 *
 * Returns undefined when the error is not a recognised constraint failure, so
 * callers can rethrow.
 */
export function mapDatabaseError(error: unknown): ApiError | undefined {
  const message = error instanceof Error ? error.message : String(error);

  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return new ApiError(
      ProblemType.RESOURCE_IN_USE,
      'This resource is still referenced by other records.',
    );
  }

  if (/UNIQUE constraint failed/i.test(message)) {
    const columns = /UNIQUE constraint failed:\s*([^\n]+)/i.exec(message)?.[1]?.trim();
    return new ApiError(
      ProblemType.ALREADY_EXISTS,
      columns
        ? `A record with the same ${columns} already exists.`
        : 'A record with the same unique key already exists.',
    );
  }

  if (/NOT NULL constraint failed/i.test(message)) {
    const column = /NOT NULL constraint failed:\s*([^\n]+)/i.exec(message)?.[1]?.trim();
    return new ApiError(
      ProblemType.VALIDATION_FAILED,
      column ? `${column} is required.` : 'A required field is missing.',
      column ? [{ name: column, reason: 'This field is required.' }] : [],
    );
  }

  if (/CHECK constraint failed/i.test(message)) {
    return new ApiError(ProblemType.VALIDATION_FAILED, 'A field is outside its allowed range.');
  }

  return undefined;
}
