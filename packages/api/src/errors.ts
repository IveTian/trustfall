export const RpcStatus = {
  OK: 'OK',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  FAILED_PRECONDITION: 'FAILED_PRECONDITION',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INTERNAL: 'INTERNAL',
} as const;

export type RpcStatusName = (typeof RpcStatus)[keyof typeof RpcStatus];

const STATUS_TO_HTTP: Record<RpcStatusName, number> = {
  OK: 200,
  INVALID_ARGUMENT: 400,
  FAILED_PRECONDITION: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly status: RpcStatusName;
  readonly httpStatus: number;
  readonly details: unknown[];

  constructor(status: RpcStatusName, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.httpStatus = STATUS_TO_HTTP[status];
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.httpStatus,
        message: this.message,
        status: this.status,
        details: this.details,
      },
    };
  }
}

export function errorBody(error: ApiError) {
  return error.toJSON();
}
