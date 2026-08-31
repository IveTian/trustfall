# Token reference

Values live in `src/tokens/*.stylex.ts`. Components must read these tokens; they must not introduce a raw hex, pixel, duration, or type size.

StyleX compiles `defineVars` to CSS custom properties. Both apps pass the same `unstable_moduleResolution.rootDir`, so the generated names match. `defineConsts` values are inlined at compile time.

## Color — `color.stylex.ts`

Themed with CSS `light-dark()`. `color-scheme` on `<html>` (`light`, `dark`, or `light dark`) selects the pair.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `surface` | `#E8EDF2` | `#10141A` | Page canvas |
| `surfaceRaised` | `#F7F9FB` | `#1A2028` | Cards, controls |
| `surfaceSunken` | `#DCE3EB` | `#0B0E13` | Recessed wells |
| `border` | `#C5CED8` | `#2E3846` | Default stroke |
| `borderStrong` | `#8A97A8` | `#4A5568` | Emphasized stroke |
| `textPrimary` | `#14181F` | `#E6EBF1` | Body and titles |
| `textMuted` | `#4E5968` | `#8B97A8` | Captions, timestamps |
| `textInverse` | `#F7F9FB` | `#14181F` | Text on accent / outage |
| `accent` | `#245A86` | `#7EB3DC` | Interactive accent |
| `accentMuted` | `#D5E6F2` | `#1B3348` | Selected tab, quiet highlight |
| `focus` | `#245A86` | `#7EB3DC` | Focus ring |
| `operational` | `#1F6B4A` | `#5DCAA0` | All-clear status |
| `operationalMuted` | `#D7EEE4` | `#143226` | Operational fill |
| `degraded` | `#8A5A00` | `#E3B341` | Degraded performance |
| `degradedMuted` | `#F4E6C3` | `#3A2C0A` | Degraded fill |
| `partialOutage` | `#B42318` | `#F97066` | Partial outage |
| `partialOutageMuted` | `#F8D5D2` | `#3A1412` | Partial-outage fill |
| `majorOutage` | `#7A1020` | `#FF8A80` | Major outage |
| `majorOutageMuted` | `#F3D0D4` | `#3B0E16` | Major-outage fill |
| `maintenance` | `#1D4E89` | `#7EABD6` | Maintenance / monitoring |
| `maintenanceMuted` | `#D5E3F2` | `#152536` | Maintenance fill |

Saturated status hues are for degradation. An all-operational page should read as near-monochrome.

## Space — `space.stylex.ts`

4px base scale. Compact density overrides these at the admin root via `createTheme`.

| Token | Comfortable | Compact |
| --- | --- | --- |
| `0` | 0 | 0 |
| `1` | 4px | 2px |
| `2` | 8px | 6px |
| `3` | 12px | 8px |
| `4` | 16px | 12px |
| `5` | 24px | 16px |
| `6` | 32px | 24px |
| `7` | 48px | 32px |
| `8` | 64px | 48px |
| `page` | 32px | 20px |
| `prose` | 40rem | 40rem |

## Text — `text.stylex.ts`

| Token | Comfortable | Compact |
| --- | --- | --- |
| `familyUi` | Atkinson Hyperlegible | same |
| `familyMono` | IBM Plex Mono | same |
| `sizeCaption` | 0.8125rem | 0.75rem |
| `sizeBody` | 1rem | 0.875rem |
| `sizeTitle` | 1.25rem | 1.0625rem |
| `sizeDisplay` | 2.25rem | 1.5rem |
| `lineCaption` | 1.25rem | 1.125rem |
| `lineBody` | 1.5rem | 1.25rem |
| `lineTitle` | 1.75rem | 1.5rem |
| `lineDisplay` | 2.5rem | 1.75rem |
| `weightRegular` | 400 | 400 |
| `weightBold` | 700 | 700 |
| `trackingDisplay` | -0.03em | -0.03em |

Timestamps and durations use `familyMono` and tabular numerals.

## Radius — `radius.stylex.ts`

`sm` 4px · `md` 8px · `lg` 12px · `pill` 999px

## Shadow — `shadow.stylex.ts`

`raised` for cards. `overlay` for dialogs and toasts.

## Consts — `const.stylex.ts`

Inlined, not CSS variables.

| Group | Tokens |
| --- | --- |
| `motion` | `fast` 120ms, `base` 200ms, `ease` cubic-bezier(0.2, 0, 0, 1) |
| `breakpoints` | `sm` 640px, `md` 880px, `reduceMotion` |
| `zIndex` | `header` 10, `toast` 40, `dialog` 50 |
| `control` | `focusWidth` 2px, `focusOffset` 2px |

Motion durations must collapse to `0ms` under `breakpoints.reduceMotion` in the consuming `create` call.

## Status map — `src/status.ts`

| Kind | Value | Tone | Icon | Label |
| --- | --- | --- | --- | --- |
| Component | `OPERATIONAL` | operational | check | Operational |
| Component | `DEGRADED_PERFORMANCE` | degraded | diamond | Degraded performance |
| Component | `PARTIAL_OUTAGE` | partialOutage | triangle | Partial outage |
| Component | `MAJOR_OUTAGE` | majorOutage | stop | Major outage |
| Incident | `INVESTIGATING` | partialOutage | triangle | Investigating |
| Incident | `IDENTIFIED` | degraded | diamond | Identified |
| Incident | `MONITORING` | maintenance | wrench | Monitoring |
| Incident | `RESOLVED` | operational | check | Resolved |
| Impact | `MINOR` | degraded | diamond | Minor |
| Impact | `MAJOR` | partialOutage | triangle | Major |
| Impact | `CRITICAL` | majorOutage | stop | Critical |

Color is never the only signal: every status renders the icon and the label.
