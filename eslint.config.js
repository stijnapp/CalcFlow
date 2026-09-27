import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', '.claude/**', 'docs/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // The size of things: a file, a function, how far it nests, how many
      // ways through it there are. These are what keep a change reviewable.
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      'max-nested-callbacks': ['error', 3],
      'sonarjs/cognitive-complexity': ['error', 15],

      // Building LaTeX is nesting templates inside templates, and a short
      // ternary chain is how a sign or a coefficient gets picked.
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-nested-conditional': 'off',
      // `type Latex = string` says what a string is for.
      'sonarjs/redundant-type-aliases': 'off',
      // `void promise` is how a deliberately unawaited call is marked.
      'sonarjs/void-use': 'off',
      // `!(a <= b)` is true for NaN where `a > b` is not; the checks rely on it.
      'sonarjs/no-inverted-boolean-check': 'off',
      // The TypeScript rule already reports these, with the options below.
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/unused-import': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Backtracking only matters on input someone else controls, and outside the
    // server every regex runs on a user agent or on the app's own LaTeX.
    files: ['apps/web/**', 'packages/**'],
    rules: { 'sonarjs/super-linear-regex': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules,
  },
  {
    // Markup is verbose: a component gets more room than a function, not more logic.
    files: ['**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // A test is a list of cases; its length is not a smell.
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
    },
  },
);
