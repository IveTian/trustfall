# TrustFall design principles

TrustFall’s design system is a decision-making tool, not a catalog of decoration. These four principles are adapted from [Adobe Spectrum](https://spectrum.adobe.com/page/principles/). Each one is a rule you can check a component against.

The visual language is shared with lociform: a canvas-gray mesh, white surfaces, quiet fills, and system UI type.

## Rational

Tokens are the only source of style values. A component must not introduce a raw hex, pixel, duration, or font size. If a value does not exist as a token, add the token first.

A status has exactly one canonical mapping to color, icon shape, and label, declared in `src/status.ts`. The public page and the admin must never invent their own mapping.

The public site uses `SiteShell`: the mesh canvas edge to edge, a `SiteNav` across the top, one reading panel below. Standalone screens (sign-in, setup, the uninitialized notice) use `MeshScreen`. The admin console uses `AppShell`, and every console screen composes the same two pieces inside it: a `PageHeader` carrying the mark, the breadcrumb and that page's actions, then a `PageBody`. Apps do not invent a third page chrome.

A control that opens a popup is a design-system component — `Menu`, `StatusSelect`, `ProfileMenu`. The console does not fall back to a native `<select>` or `alert()`, whose popups the theme cannot reach.

## Human

WCAG 2.2 AA is a build requirement. Status is never conveyed by color alone: every status renders a distinct icon shape and a text label next to its color.

Honor `prefers-color-scheme` and `prefers-reduced-motion`. Timestamps render in the reader’s chosen time zone — their own by default, switchable from the site bar — with the absolute UTC value available on hover and to assistive technology.

Type is the system UI stack so CJK and Latin share a face. Monospace is reserved for timestamps, IDs, and durations.

## Focused

The public page answers “is it up?” in one glance above the fold. Saturated color is reserved for actual degradation. An all-operational page should read as quiet and near-monochrome. When everything is highlighted, nothing is.

The mesh is the signature of standalone screens. It originates at the white panel so grid lines radiate from the content, not from the viewport corner. Panel width and height snap to whole 96px cells (`mesh-runtime.ts`); the CSS fallback is centered until that script measures.

## Collaborative

The system ships with this file, a token catalog in `TOKENS.md`, a per-component checklist in `CHECKLIST.md`, and a `/design` gallery. A component is not done until the checklist is true for it.

One density. Components read tokens; they do not fork comfortable vs compact layouts.
