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
  return (await request<T>(path, init)).data;
}

/**
 * A read that keeps the entity tag alongside the body, for a screen that
 * will write the resource back: sending the tag as `If-Match` makes the
 * server refuse to overwrite an edit that landed in between.
 */
export async function apiRead<T>(path: string): Promise<{ data: T; etag?: string }> {
  const { data, res } = await request<T>(path);
  return { data, etag: res.headers.get('etag') ?? undefined };
}

/**
 * Every item of a collection, following `next_cursor` to the end. For the
 * console's pickers and lists, which need the whole set rather than a page.
 */
export async function apiAll<T>(path: string, pageSize = 100): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('page_size', String(pageSize));
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    const page = await api<Page<T>>(`${url.pathname}${url.search}`);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; res: Response }> {
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

  return { data: data as T, res };
}
