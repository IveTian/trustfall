<!--
Thanks for contributing to TrustFall. Read CONTRIBUTING.md if you have not yet —
this template is the short version of it.

Delete the sections that do not apply. An honest "not run" beats a ticked box.
-->

## What this changes

<!-- One or two sentences. What is different after this merges, and why. -->

## How to verify

<!-- The steps a reviewer runs to see it work. Where: 4321 (public page),
5173/admin (admin), 8787 (production-shaped Worker), or a test name. -->

Closes #

## Checks

- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

## The rule that is easiest to break

- [ ] **No synthetic monitoring.** Nothing here decides on its own that a
      component is down. Component state changes because an operator said so, or
      because an operator's maintenance window is running.

## If this touches the UI

- [ ] Follows [PRINCIPLES.md](https://github.com/IveTian/trustfall/blob/master/packages/design/PRINCIPLES.md) — styling is StyleX
      on design tokens, no raw color or spacing values
- [ ] Meets [CHECKLIST.md](https://github.com/IveTian/trustfall/blob/master/packages/design/CHECKLIST.md)
- [ ] New primitives live in `packages/design`, not in an app
- [ ] Public page and admin still share the same tokens
- [ ] Screenshots below, in light and dark

<!-- Screenshots here. -->

## If this touches the API

- [ ] The OpenAPI document changed first, then the implementation
- [ ] Follows the [Zalando guidelines](https://opensource.zalando.com/restful-api-guidelines/)
      as CONTRIBUTING.md summarises them: kebab-case paths, `snake_case`
      properties, `UPPER_SNAKE_CASE` enums, `{ items, next_cursor }` collections,
      RFC 9457 problem documents on every failure
- [ ] PATCH leaves omitted properties unchanged; explicit `null` clears a
      nullable one
- [ ] Breaking change? It ships alongside its predecessor with `Deprecation` and
      `Sunset` headers, not in place of it

## If this touches the database

- [ ] Exactly one new file in `migrations/`, appended — no landed migration was
      edited
- [ ] Applied locally with `pnpm db:migrate:local`
- [ ] Breaking change is expand-contract across two releases (add column, write
      both, backfill, drop column)
- [ ] No `drizzle-kit generate` output was committed into `migrations/`

## Notes for the reviewer

<!-- Trade-offs you made, things you are unsure about, what you deliberately
left out. -->
