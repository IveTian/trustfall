import astro from '@astrojs/cloudflare/entrypoints/server';
import { handleQueue } from '@trustfall/jobs/queue';
import { handleScheduled } from '@trustfall/jobs/scheduled';
import type { Job } from '@trustfall/jobs';

export { Dispatcher } from '@trustfall/jobs/dispatcher';

/**
 * The Worker entry.
 *
 * The Cloudflare adapter only supplies a default for `main`
 * (`main: config.main ?? '@astrojs/cloudflare/entrypoints/server'`), so pointing
 * `wrangler.jsonc` at this file keeps Astro's fetch handler intact while adding
 * the handlers a status page needs to run maintenance windows, deliver
 * webhooks, and roll up uptime.
 *
 * Nothing here may touch Astro.locals: scheduled and queue invocations have no
 * request. They reach bindings through `cloudflare:workers`, the same way
 * packages/api/src/bindings.ts does.
 */
export default {
  fetch: astro.fetch,
  scheduled: handleScheduled,
  queue: handleQueue,
} satisfies ExportedHandler<Env, Job>;
