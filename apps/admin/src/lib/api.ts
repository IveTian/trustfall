/**
 * Every API failure is an RFC 9457 problem document:
 * `{ type, title, status, detail, instance?, invalid_params? }` served as
 * `application/problem+json`. `type` is the stable half — branch on it rather
 * than on `detail`, which is prose — and `invalid_params` carries field-level
 * causes for forms to render inline.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly type: string,
    readonly invalidParams: InvalidParam[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** True when retrying the identical request could plausibly succeed. */
  get retryable(): boolean {
    return this.httpStatus >= 500 || this.httpStatus === 429;
  }
}

export type InvalidParam = { name: string; reason: string };

/** Every collection response. `next_cursor` is absent on the last page. */
export type Page<T> = { items: T[]; next_cursor?: string };

type Problem = {
  type?: string;
  title?: string;
  detail?: string;
  invalid_params?: InvalidParam[];
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  // 204 and other empty bodies are valid; do not treat them as parse failures.
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const problem = (data ?? {}) as Problem;
    throw new ApiRequestError(
      problem.detail || problem.title || res.statusText || 'Request failed.',
      res.status,
      problem.type ?? 'about:blank',
      problem.invalid_params ?? [],
    );
  }

  return data as T;
}
