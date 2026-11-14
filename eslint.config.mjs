import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import domains from './scripts/eslint-domain-order.mjs'

export default tseslint.config(
  // `SRD 5.2.1/` is notes.
  { ignores: ['dist/**', 'node_modules/**', 'SRD 5.2.1/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The rules library is JavaScript, and runs where the TypeScript does.
    files: ['src/derive/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // The domain order: every folder under `src/` is a domain, an import points
    // only down `scripts/domains.mjs`, and another domain is reached only
    // through its `index.ts` (pure) or `host.ts` (React and Obsidian). Tests,
    // fixtures and the harness reach internals on purpose.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__fixtures__/**', 'src/__harness__/**'],
    plugins: { domains },
    rules: { 'domains/order': 'error' },
  },
  {
    // Large files only shrink: past 600 lines, split before adding. A warning,
    // so lint stays green on the few files already over it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/__harness__/**', '**/__fixtures__/**'],
    rules: {
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // PostCSS resolves its config with `require`, so this file is CommonJS.
    files: ['**/*.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
)
