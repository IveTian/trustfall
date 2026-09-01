import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import stylex from '@stylexjs/unplugin';
import { defineConfig } from 'astro/config';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  output: 'server',
  session: false,
  adapter: cloudflare({
    imageService: 'compile',
    configPath: fileURLToPath(new URL('../../wrangler.jsonc', import.meta.url)),
    // Dev runs with apps/web as the Vite root, so Miniflare would persist to
    // apps/web/.wrangler/state — a different D1 file than `db:migrate:local`
    // and `preview` write to. Pin it to the workspace root so all three share
    // one local database.
    persistState: { path: fileURLToPath(new URL('../../.wrangler/state', import.meta.url)) },
  }),
  integrations: [react()],
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      exclude: [
        'better-auth',
        'drizzle-orm',
        '@trustfall/api',
        '@trustfall/db',
        '@trustfall/design',
        '@trustfall/shared',
      ],
    },
    ssr: {
      noExternal: ['@trustfall/design', '@trustfall/api', '@trustfall/db', '@trustfall/shared'],
      optimizeDeps: {
        exclude: ['better-auth', 'drizzle-orm'],
      },
    },
    plugins: [
      stylex.vite({
        useCSSLayers: true,
        unstable_moduleResolution: {
          type: 'commonJS',
          rootDir: workspaceRoot,
        },
      }),
    ],
  },
});
