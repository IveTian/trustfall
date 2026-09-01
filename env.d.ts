/**
 * Values that arrive as Worker secrets or vars rather than as bindings.
 *
 * `wrangler types` only sees what wrangler.jsonc declares, so it generates DB,
 * ASSETS and DISPATCHER but not these. Declaring them here merges them into the
 * generated `Env`, which keeps one interface for the whole workspace instead of
 * a hand-written copy per package.
 */
interface Env {
  /**
   * Better Auth signing secret, 32+ characters. Falls back to a generated value
   * stored in the D1 `settings` table when unset; see README.
   */
  BETTER_AUTH_SECRET?: string;
  /** Public origin, required when serving from a custom domain. */
  BETTER_AUTH_URL?: string;

  /**
   * Job queue. Present only when the paid-plan `queues` block in wrangler.jsonc
   * is enabled, so it cannot come from `wrangler types` and is optional here.
   * packages/jobs probes for it to pick a delivery mode.
   */
  EVENTS?: Queue;
}
