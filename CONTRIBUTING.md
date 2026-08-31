# Contributing to TrustFall

TrustFall is a manually-updated status page. It does not probe services.

## Principles

Read [packages/design/PRINCIPLES.md](packages/design/PRINCIPLES.md) before changing UI. Components are not done until [packages/design/CHECKLIST.md](packages/design/CHECKLIST.md) is true.

API changes must follow [Google AIP](https://google.aip.dev/): resource names, `pageSize` / `pageToken`, `updateMask` on PATCH, and the AIP-193 error shape. Hono routes use Zod via `@hono/zod-openapi`.

## Local development

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

The public page is at `http://localhost:4321` during `pnpm dev`. A production-shaped Worker is `pnpm preview` at `http://localhost:8787`. The admin app in production is served from `/admin/`. During UI work you can also run `pnpm --filter @trustfall/admin dev` (proxies `/api` to the Astro server).

## Pull requests

- Keep the public page and admin on the same design tokens.
- Do not add a probe, cron, or synthetic check. Operators update status.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` before opening a PR.
