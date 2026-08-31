# Component checklist

A component is complete when every item is true.

- Keyboard: every interactive control is reachable and operable with the keyboard.
- Focus: a visible focus ring is present and uses the `accent` token, not a browser default the theme would hide.
- Status: if the component represents a status, it uses `status.ts` for color, icon, and label. Color is never the only signal.
- Dark mode: the component is readable under `color-scheme: light`, `dark`, and `light dark`.
- Reduced motion: any motion collapses under `prefers-reduced-motion`.
- Logical properties: spacing and borders use logical properties (`paddingInline`, `marginBlock`, `insetInlineStart`) rather than physical left/right.
- Tokens: no raw hex, px, ms, or type size appears in the component file.
- Copy: labels name what the person controls, in sentence case, with a verb that matches the resulting toast or confirmation.
