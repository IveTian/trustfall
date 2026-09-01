# Contributing to TrustFall

TrustFall is a status page whose component states are asserted by people, not
by monitoring. It does not probe services.

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

`packages/design/src/icons.css` is generated. Do not edit it; after upgrading
remixicon run `pnpm --filter @trustfall/design icons:sync`. It exists so the
build emits only the woff2 face instead of all five formats, which cost 4.5MB.

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

The public page is at `http://localhost:4321` during `pnpm dev`. A production-shaped Worker is `pnpm preview` at `http://localhost:8787`. The admin app in production is served from `/admin/`. During UI work you can also run `pnpm --filter @trustfall/admin dev` (proxies `/api` to the Astro server).

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
