# Contributing to TrustFall

TrustFall is a status page whose component states are asserted by people, not
by monitoring. It does not probe services.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Found a
vulnerability? Do not open an issue — [SECURITY.md](SECURITY.md) has the private
reporting channel.

## Principles

Read [packages/design/PRINCIPLES.md](packages/design/PRINCIPLES.md) before changing UI. Components are not done until [packages/design/CHECKLIST.md](packages/design/CHECKLIST.md) is true.

API changes must follow the [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/):
resource-oriented paths in kebab-case, `snake_case` properties and query
parameters, `UPPER_SNAKE_CASE` enum values, opaque identifiers, collections as
`{ items, next_cursor }`, and RFC 9457 problem documents
(`application/problem+json`) for every failure. PATCH leaves omitted properties
unchanged; an explicit `null` clears a nullable one. There is no version in the
URL: the contract evolves compatibly, and anything that cannot ships alongside
its predecessor with `Deprecation` and `Sunset` headers. Hono routes use Zod via
`@hono/zod-openapi`, and the document at `/api/openapi.json` is the contract —
write it there first, then implement.

## Toolchain

Linting is [oxlint](https://oxc.rs), formatting is [oxfmt], testing is
[Vitest]. `pnpm lint` also runs a one-rule ESLint pass: oxlint has no StyleX
plugin, and `@stylexjs/valid-styles` is the only automated enforcement of the
first design principle. That is the whole reason ESLint is still installed —
see `eslint.stylex.config.js`.

`packages/icon/src/generated` is generated. Do not edit it; to add an icon,
name it in `packages/icon/icons.config.json` and run
`pnpm --filter @trustfall/icon icons:build`, which draws it from the sibling
`central-icon` checkout, then name it for the apps in `packages/icon/src/index.ts`.
See `packages/icon/README.md`.

## Migrations

Migration SQL in `migrations/` is written by hand and applied in order; D1 has
no down-migrations. One migration per pull request, never edit one that has
landed, and make breaking changes in the expand-contract shape (add column,
write both, backfill, drop column) across two releases.

`drizzle-kit generate` is a checking aid only — its output does not go into
`migrations/`. The schema uses partial unique indexes, generated columns and
views, which drizzle-kit does not round-trip; running it and committing the
result would drop them.

[oxfmt]: https://github.com/oxc-project/oxfmt
[Vitest]: https://vitest.dev

## Local development

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` runs both dev servers: the public page at `http://localhost:4321` and the admin at `http://localhost:5173/admin/` (Vite, hot reload, `/api` proxied to the Astro server). Do admin UI work at `5173`: `4321/admin` serves the last built bundle from `apps/web/public/admin/`, which only changes on `pnpm --filter @trustfall/admin build`. A production-shaped Worker is `pnpm preview` at `http://localhost:8787`. The admin app in production is served from `/admin/`.

## Pull requests

- Keep the public page and admin on the same design tokens.
- **No synthetic monitoring.** TrustFall never probes your services. A component
  is down because an operator said so, or because a maintenance window that an
  operator scheduled is running. If you want a probe, put it in front of the API
  and have it `PATCH /api/components/{component_id}`.
- **Automation is allowed, but only for state an operator already declared.**
  The cron trigger, the `Dispatcher` durable object and (on paid plans) queues
  exist to move maintenance windows through their schedule, aggregate uptime
  history, deliver webhooks and send subscriber email. They never decide that a
  component is down.
- Run `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before opening a PR.
