# TrustFall

A Cloudflare-native status page. Operators update availability by hand. There is no probe.

Public visitors get an Astro page that answers “is it up?” in one glance. Operators get a React admin at `/admin`. Both talk to a Hono API on a single Worker, with state in D1.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ivetian/trustfall)

Replace the URL in that badge with your fork after you publish the repository.

## One-click deploy

1. Click the button. Cloudflare clones the repo, provisions D1, and deploys the Worker.
2. Open `/admin`. Create the owner account. Sign-up stays closed after that.
3. Add component groups and components, then publish incidents as they happen.

If Cloudflare did not apply SQL automatically, the first visit to setup will attempt Better Auth’s programmatic migrations. Application tables come from `migrations/` via `wrangler d1 migrations apply DB --remote` in the deploy script.

## Local development

Requires Node 22+ and pnpm 10.

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

- Status page: `http://localhost:4321` (Astro may pick the next port if 4321 is taken)
- Production-shaped Worker locally: `pnpm preview` then `http://localhost:8787`
- Admin (dev, optional): `pnpm --filter @trustfall/admin dev` then `http://localhost:5173/admin/`
- API docs: `/api/docs`
- Design gallery (dev only): `/design`

`wrangler.jsonc` at the repo root is the source of bindings for the Astro Cloudflare adapter. After `astro build`, Wrangler deploys the generated `apps/web/dist/server` Worker (`entry.mjs`), which is why `preview` and `deploy` pass `--config apps/web/dist/server/wrangler.json`.

## Auth secret

Better Auth needs a 32+ character secret.

- Recommended in production: `wrangler secret put BETTER_AUTH_SECRET`
- One-click default: if the secret is unset, TrustFall generates one on first boot and stores it in D1 `settings`. Sessions live in the same database, so this works without extra setup. Anyone with D1 query access can read it. Put a Worker secret in place if that is not acceptable.

On a custom domain, set `BETTER_AUTH_URL` to the public origin.

## Design

Tokens, density themes, and components live in `packages/design`. See [PRINCIPLES.md](packages/design/PRINCIPLES.md), [TOKENS.md](packages/design/TOKENS.md), and [CHECKLIST.md](packages/design/CHECKLIST.md). Color uses CSS `light-dark()` and a `color-scheme` switch. The admin applies a compact density theme at its root. Status color, icon shape, and label are defined once in `packages/design/src/status.ts`.

## Stack

Astro 7 SSR, React 19 admin SPA, Hono 4, Better Auth, Drizzle on D1, StyleX, one Cloudflare Worker.

## License

Copyright (C) 2026 TrustFall contributors

TrustFall is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full GNU AGPLv3 text.
