# @trustfall/icon

The icons the apps draw, generated on demand from [Central Icons](https://centralicons.com) through the generator in the sibling `central-icon` checkout. Nothing here imports the full catalogue: `src/generated` holds one small React component per icon, and `src/index.ts` names them for the apps.

## Adding an icon

1. Find its Central name in the sibling checkout: `pnpm icons:search <word>` there.
2. Add the name to `icons` (outlined) or `filled` in `icons.config.json`.
3. Regenerate: `pnpm --filter @trustfall/icon icons:build`. The checkout is expected at `../central-icon`; set `CENTRAL_ICON_DIR` to point elsewhere.
4. Name it in `src/index.ts` — the apps refer to icons by these names, never by Central's.

`src/generated` is generated; do not edit it. The icon assets stay under the Iconists licence in `src/generated/LICENSE.md`.
