import js from '@eslint/js';
import stylex from '@stylexjs/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.pnpm-store/**',
      '**/dist/**',
      '**/.astro/**',
      '**/.wrangler/**',
      'apps/web/public/admin/**',
      'worker-configuration.d.ts',
      'migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@stylexjs': stylex,
      'react-hooks': reactHooks,
    },
    rules: {
      '@stylexjs/valid-styles': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
