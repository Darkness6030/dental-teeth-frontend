import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist', '.kilo/**']),
  {
    files: ['**/*.{js,jsx}'],
    settings: { 'import/resolver': { node: { extensions: ['.js', '.jsx'] } } },
    plugins: {
      import: importPlugin,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'import/no-unresolved': ['error', { ignore: ['^eslint/config$', '^@vitejs/plugin-react$'] }],
      'import/named': 'error',
      'import/default': 'error',
      'import/export': 'error',
    },
  },
]);
