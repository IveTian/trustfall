# Token reference

Values live in `src/tokens/*.stylex.ts`. Components must read these tokens; they must not introduce a raw hex, px, duration, or type size.

StyleX compiles `defineVars` to CSS custom properties. Both apps pass the same `unstable_moduleResolution.rootDir`, so the generated names match. `defineConsts` values are inlined at compile time. Color and shadow are consts so CSS `light-dark()` stays a single valid color value.

## Color — `color.stylex.ts`

Themed with CSS `light-dark()` inlined via `defineConsts`. `color-scheme` on `<html>` (`light`, `dark`, or `light dark`) selects the pair.

| Token                | Light              | Dark               | Role                       |
| -------------------- | ------------------ | ------------------ | -------------------------- |
| `surface`            | `#EFEFEF`          | `#141414`          | Canvas behind mesh / shell |
| `sidebar`            | `#FFFFFF`          | `#181818`          | App shell sidebar panel    |
| `surfaceRaised`      | `#FFFFFF`          | `#1A1A1A`          | Panels, cards, dialogs     |
| `surfaceSubtle`      | `#F6F6F6`          | `#1F1F1F`          | Hover fill, dialog footer  |
| `surfaceSunken`      | `#EEEEEE`          | `#242424`          | Input fill, quiet wells    |
| `border`             | `#E2E2E2`          | `#2E2E2E`          | Default stroke             |
| `borderGrid`         | `#DCDCDC`          | `#333333`          | Mesh lines                 |
| `borderStrong`       | `#AFAFAF`          | `#545454`          | Emphasized stroke          |
| `textPrimary`        | `#141414`          | `#EFEFEF`          | Body and titles            |
| `textMuted`          | `#6B6B6B`          | `#AFAFAF`          | Captions, timestamps       |
| `textInverse`        | `#FFFFFF`          | `#141414`          | Text on accent             |
| `accent`             | `#5F7EEC`          | `#8CA3F2`          | Interactive accent         |
| `accentHover`        | `#4763CE`          | `#5F7EEC`          | Accent hover               |
| `accentActive`       | `#384EA6`          | `#4763CE`          | Accent press               |
| `accentMuted`        | `#EFF2FD`          | `#1B2248`          | Quiet highlight            |
| `focus`              | `#5F7EEC`          | `#8CA3F2`          | Focus ring                 |
| `operational`        | `#03703C`          | `#5DCAA0`          | All-clear status           |
| `operationalMuted`   | `#E6F2ED`          | `#143226`          | Operational fill           |
| `degraded`           | `#996F00`          | `#E3B341`          | Degraded performance       |
| `degradedMuted`      | `#FFFAF0`          | `#3A2C0A`          | Degraded fill              |
| `partialOutage`      | `#E11900`          | `#F97066`          | Partial outage             |
| `partialOutageMuted` | `#FFEFED`          | `#3A1412`          | Partial-outage fill        |
| `majorOutage`        | `#AB1300`          | `#FF8A80`          | Major outage               |
| `majorOutageMuted`   | `#FFEFED`          | `#3B0E16`          | Major-outage fill          |
| `maintenance`        | `#5F7EEC`          | `#8CA3F2`          | Maintenance / monitoring   |
| `maintenanceMuted`   | `#EFF2FD`          | `#1B2248`          | Maintenance fill           |
| `scrim`              | `rgba(0,0,0,0.45)` | `rgba(0,0,0,0.65)` | Dialog backdrop            |

Saturated status hues are for degradation. An all-operational page should read as near-monochrome.

## Space — `space.stylex.ts`

4px base scale.

| Token    | Value                                   | Role                   |
| -------- | --------------------------------------- | ---------------------- |
| `0`–`8`  | 0 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 | Stack gaps and padding |
| `page`   | 32px                                    | Mesh panel inset       |
| `gutter` | 28px                                    | Console content inset  |
| `prose`  | 40rem                                   | Dialog max width       |

Mesh cell size is `MESH_CELL_PX` (96) in `tokens/mesh.ts`, with the CSS length in `mesh.cell`.

## Text — `text.stylex.ts`

| Token                             | Value                                                   |
| --------------------------------- | ------------------------------------------------------- |
| `familyUi`                        | system-ui stack (CJK faces before Latin-only fallbacks) |
| `familyMono`                      | ui-monospace stack                                      |
| `sizeCaption` / `lineCaption`     | 12 / 16                                                 |
| `sizeBodySmall` / `lineBodySmall` | 14 / 20                                                 |
| `sizeBody` / `lineBody`           | 16 / 24                                                 |
| `sizeTitle` / `lineTitle`         | 20 / 28                                                 |
| `sizeDisplay` / `lineDisplay`     | 24 / 32                                                 |
| `weightRegular`                   | 400                                                     |
| `weightMedium`                    | 500                                                     |
| `weightBold`                      | 600                                                     |

Timestamps and durations use `familyMono` and tabular numerals.

## Radius — `radius.stylex.ts`

`sm` 4px (interactive) · `md` 8px (surfaces) · `lg` 12px · `pill` 999px

## Shadow — `shadow.stylex.ts`

`raised` for lifted objects. `overlay` for menus, dialogs, and toasts. Inlined consts (same `light-dark()` reason as color).

## Consts — `const.stylex.ts`

Inlined, not CSS variables.

| Group         | Tokens                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `motion`      | `fast` 120ms, `base` 200ms, `ease` cubic-bezier(0.2, 0, 0, 1)                                                                      |
| `breakpoints` | `sm` 640px, `md` 880px, `reduceMotion`                                                                                             |
| `zIndex`      | `header` 10, `menu` 30, `toast` 40, `dialog` 50                                                                                    |
| `control`     | `focusWidth` 2px, `focusOffset` 2px, `heightSm` 28px, `heightMd` 32px, `heightLg` 40px, `sidebarWidth` 240px, `menuMaxWidth` 280px |
| `mesh`        | `cell` 96px, `line` 1px                                                                                                            |

Motion durations must collapse to `0ms` under `breakpoints.reduceMotion` in the consuming `create` call.

## Status map — `src/status.ts`

| Kind      | Value                  | Tone          | Icon     | Label                |
| --------- | ---------------------- | ------------- | -------- | -------------------- |
| Component | `OPERATIONAL`          | operational   | check    | Operational          |
| Component | `DEGRADED_PERFORMANCE` | degraded      | diamond  | Degraded performance |
| Component | `PARTIAL_OUTAGE`       | partialOutage | triangle | Partial outage       |
| Component | `MAJOR_OUTAGE`         | majorOutage   | stop     | Major outage         |
| Incident  | `INVESTIGATING`        | partialOutage | triangle | Investigating        |
| Incident  | `IDENTIFIED`           | degraded      | diamond  | Identified           |
| Incident  | `MONITORING`           | maintenance   | wrench   | Monitoring           |
| Incident  | `RESOLVED`             | operational   | check    | Resolved             |
| Impact    | `MINOR`                | degraded      | diamond  | Minor                |
| Impact    | `MAJOR`                | partialOutage | triangle | Major                |
| Impact    | `CRITICAL`             | majorOutage   | stop     | Critical             |

Color is never the only signal: every status renders the icon and the label.
