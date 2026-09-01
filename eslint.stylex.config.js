import stylex from '@stylexjs/eslint-plugin';
import tseslint from 'typescript-eslint';

/**
 * oxlint handles everything else. This config exists for one rule.
 *
 * `@stylexjs/valid-styles` is the only automated enforcement of the first
 * design principle — "Tokens are the only source of style values. A component
 * must not introduce a raw hex, pixel, duration, or font size"
 * (packages/design/PRINCIPLES.md). oxlint has no StyleX plugin, so dropping
 * ESLint entirely would leave that principle to reviewer memory.
 *
 * Scoped to the files that actually call stylex, so it stays fast.
 */
export default tseslint.config({
  files: ['packages/design/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    },
  },
  plugins: { '@stylexjs': stylex },
  rules: {
    '@stylexjs/valid-styles': 'error',
  },
});
