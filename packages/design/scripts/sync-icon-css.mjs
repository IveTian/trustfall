/**
 * Regenerates src/icons.css from the installed remixicon package.
 *
 * Remix Icon ships one stylesheet that references five font formats. Vite emits
 * every format it sees, so importing it directly costs 4.7MB of assets — of
 * which 4.5MB are eot/ttf/svg/woff fallbacks for IE and pre-2016 iOS. This
 * script keeps the icon class rules and swaps the @font-face for a woff2-only
 * one.
 *
 * Run after upgrading remixicon:
 *   pnpm --filter @trustfall/design icons:sync
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = require.resolve('remixicon/fonts/remixicon.css');
const target = fileURLToPath(new URL('../src/icons.css', import.meta.url));

const css = readFileSync(source, 'utf8');

const version = /Remix Icon v([\d.]+)/.exec(css)?.[1] ?? 'unknown';

// Drop the upstream @font-face; everything after it is the icon class table.
const fontFaceEnd = css.indexOf('}', css.indexOf('@font-face'));
if (fontFaceEnd === -1) {
  throw new Error('Could not find the @font-face block in remixicon.css.');
}
const iconRules = css.slice(fontFaceEnd + 1).trimStart();

if (/url\(/.test(iconRules)) {
  throw new Error('Icon rules still reference a font file; the stylesheet layout changed.');
}

const out = `/*
 * GENERATED — do not edit. Run \`pnpm --filter @trustfall/design icons:sync\`.
 *
 * Remix Icon v${version} (https://remixicon.com), Remix Icon License 1.0.
 * The upstream @font-face is replaced with a woff2-only one: the other four
 * formats exist for IE and iOS 4, and cost 4.5MB of emitted assets.
 */
@font-face {
  font-family: "remixicon";
  src: url("remixicon/fonts/remixicon.woff2") format("woff2");
  font-display: swap;
}

${iconRules}`;

writeFileSync(target, out);
console.log(`icons.css written from remixicon v${version} (${out.length} bytes)`);
