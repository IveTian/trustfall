import { defineConfig } from 'vitest/config';

/**
 * Two projects, split by what a test needs to run.
 *
 * `unit` covers the pure logic — status roll-ups, rank ordering, page cursors,
 * error mapping, uptime aggregation. These are the parts where a wrong answer is
 * silent and permanent, and they run in plain Node in milliseconds.
 *
 * A second `workers` project arrives with the first code that needs real D1 or
 * Durable Object bindings. It cannot reuse the root wrangler.jsonc: `main`
 * points at the Astro worker entry, whose `astro/app/entrypoint` virtual module
 * only resolves inside an astro build. That project gets its own
 * wrangler.test.jsonc with a bindings-only entry, and Astro SSR is covered by
 * end-to-end tests instead.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/*/src/**/*.test.ts'],
          exclude: ['**/node_modules/**'],
        },
      },
    ],
  },
});
