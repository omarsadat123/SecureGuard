import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/security-results/**'] },
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser, ...globals.jest }
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
  },
  {
    files: ['**/*.jsx'],
    plugins: { react },
    rules: { 'react/jsx-uses-vars': 'error' }
  }
];
