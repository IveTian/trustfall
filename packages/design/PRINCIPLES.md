# TrustFall design principles

TrustFall’s design system is a decision-making tool, not a catalog of decoration. These four principles are adapted from [Adobe Spectrum](https://spectrum.adobe.com/page/principles/). Each one is a rule you can check a component against.

## Rational

Tokens are the only source of style values. A component must not introduce a raw hex, pixel, duration, or font size. If a value does not exist as a token, add the token first.

A status has exactly one canonical mapping to color, icon shape, and label, declared in `src/status.ts`. The public page and the admin must never invent their own mapping.

## Human

WCAG 2.2 AA is a build requirement. Status is never conveyed by color alone: every status renders a distinct icon shape and a text label next to its color.

Honor `prefers-color-scheme` and `prefers-reduced-motion`. Timestamps render in the reader’s local timezone, with the absolute UTC value available on hover and to assistive technology.

Atkinson Hyperlegible is the UI typeface because a status page is often read under stress, on a phone, at an odd hour. IBM Plex Mono is reserved for timestamps, IDs, and durations.

## Focused

The public page answers “is it up?” in one glance above the fold. Saturated color is reserved for actual degradation. An all-operational page should read as quiet and near-monochrome. When everything is highlighted, nothing is.

## Collaborative

The system ships with this file, a token catalog in `TOKENS.md`, a per-component checklist in `CHECKLIST.md`, and a `/design` gallery. A component is not done until the checklist is true for it.

Density is a theme, not a fork. The public page uses the default comfortable density. The admin applies the compact theme at its root. Components read tokens and never hardcode either density.
