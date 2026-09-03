/**
 * Generates src/generated from the Central Icons catalogue, through the
 * generator in the sibling `central-icon` checkout (../../../../central-icon,
 * or CENTRAL_ICON_DIR). Only the icons named in icons.config.json are
 * written: `icons` in the outlined style, `filled` in the filled style with
 * a `Filled` suffix on the component name. src/index.ts names them for the
 * apps; add an icon there after adding it here.
 *
 *   pnpm --filter @trustfall/icon icons:build
 */
import { access, copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const central =
  process.env.CENTRAL_ICON_DIR ??
  fileURLToPath(new URL('../../../../central-icon/', import.meta.url));
try {
  await access(join(central, 'scripts/lib/data.mjs'));
} catch {
  throw new Error(
    `The central-icon checkout was not found at ${central}. Clone it beside this repo or set CENTRAL_ICON_DIR.`,
  );
}
const { loadData, selectIcons, packageRoot, packageInfo } = await import(
  pathToFileURL(join(central, 'scripts/lib/data.mjs')).href
);
const { writeReactIcons } = await import(
  pathToFileURL(join(central, 'scripts/lib/react.mjs')).href
);

const config = JSON.parse(await readFile(join(root, 'icons.config.json'), 'utf8'));
const names = (list) => (Array.isArray(list) ? list : []);
const data = await loadData();
const outlined = selectIcons(data, config.style, names(config.icons));
const filled = selectIcons(data, config.filledStyle, names(config.filled)).map((icon) => ({
  ...icon,
  name: `${icon.name}Filled`,
}));
const icons = [...outlined, ...filled];

const output = join(root, 'src/generated');
// Regenerated from scratch, so a name dropped from the config leaves no file behind.
await rm(output, { recursive: true, force: true });
await writeReactIcons(output, icons);
await copyFile(join(packageRoot, 'LICENSE.md'), join(output, 'LICENSE.md'));
await writeFile(
  join(output, 'manifest.json'),
  `${JSON.stringify(
    {
      package: packageInfo.name,
      version: packageInfo.version,
      style: config.style,
      filledStyle: config.filledStyle,
      icons: icons.map((icon) => icon.name),
    },
    null,
    2,
  )}\n`,
);
console.log(`Generated ${icons.length} icons into ${output}`);
