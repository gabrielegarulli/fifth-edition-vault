// What Obsidian's community directory lints this repository with (MYDND-187).
//
//   npm run lint:directory     # errors only, as CI runs it
//
// The directory's automated review runs eslint-plugin-obsidianmd's recommended
// config over the source and fails a release on any of its errors. Its warnings
// do not fail a review, but the plugin's public page counts them as Risks
// (4,492 on 0.0.3, 4,130 of them in the then-untyped `src/derive/` library). CI
// runs this with `--quiet`, so it fails on what would fail the review and,
// outside the tests, on what the page would count (MYDND-189, MYDND-209).
// `npm run lint` stays the project's own, stricter-in-other-ways lint. Tests
// are exempt by name, as the scanner exempts them; tool configs and scripts
// are out.
import { defineConfig, globalIgnores } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'
import reactHooks from 'eslint-plugin-react-hooks'

const recommended = obsidianmd.configs.recommended

// The scanner reports typescript-eslint's type-checked rules as warnings,
// where the recommended config makes some of them errors. Warnings here, as
// there.
const typescriptAsWarnings = Object.fromEntries(
  [...new Set(recommended.flatMap(c => Object.keys(c.rules ?? {})))]
    .filter(rule => rule.startsWith('@typescript-eslint/'))
    .map(rule => [rule, 'warn']),
)

// The rules the recommended config switches on, as its last word on each says.
const severity = value => (Array.isArray(value) ? value[0] : value)
const enabledRules = new Set(
  Object.entries(Object.assign({}, ...recommended.map(c => c.rules ?? {})))
    .filter(([, value]) => !['off', 0].includes(severity(value)))
    .map(([rule]) => rule),
)

// What the directory's scorecard counts as a Risk (MYDND-189), as errors, so
// a new one fails CI instead of showing on the plugin's public page. Of the
// type-checked rules the scorecard lists only these, and none of the stricter
// ones above (no-unsafe-type-assertion, strict-boolean-expressions, …). With
// obsidianmd's own rules, every one it switches on. `validate-manifest` was
// the last warning, kept because the description opened on the plugin's name;
// it no longer does (MYDND-218), so it is an error on `manifest.json` below.
//
// The settings tab's two rules and `no-deprecated` were warnings too until
// MYDND-210 gave the tab `getSettingDefinitions()`. Its `display()` stays, as
// the fallback for Obsidian before 1.13 (minAppVersion is 1.11.4), which
// `no-deprecated-display` allows until the minAppVersion reaches 1.13, and
// obsidianmd's own `no-deprecated` options allow `display` by name. The one
// `no-deprecated` warning left was `tseslint.config` in eslint.config.mjs,
// now `defineConfig`.
const SCORECARD_TYPESCRIPT = [
  'no-unsafe-argument',
  'no-unsafe-assignment',
  'no-unsafe-call',
  'no-unsafe-member-access',
  'no-unsafe-return',
  'unbound-method',
  'no-unnecessary-type-assertion',
  'no-deprecated',
]
// The files exempt from the scorecard: tests, by name, and nothing else.
// obsidianmd's recommended config carries a longer list (`test-support/`,
// `__mocks__/`, `*.setup.*`, …) on its runtime rules, and the scanner does not
// honour all of it: MYDND-214 moved the harness to `src/test-support/`, a name
// on that list, and the directory's review still counted its timers and
// `createElement`s (MYDND-218). The one exemption seen honoured is a file named
// `*.test.*`, so that is the gate's only one, stricter than the plugin's, and
// the harness is `src/test-support/*.stub.test.*`. A test helper named
// anything else is source to the scanner, and fails here. Tool configs and
// `scripts/` are out by `globalIgnores` below.
const SCANNER_SKIPS = ['**/*.test.*']

const scorecardAsErrors = Object.fromEntries([
  ...SCORECARD_TYPESCRIPT.map(rule => [`@typescript-eslint/${rule}`, 'error']),
  ...[...enabledRules]
    .filter(rule => rule.startsWith('obsidianmd/') && rule !== 'obsidianmd/validate-manifest')
    .map(rule => [rule, 'error']),
])

export default defineConfig([
  // Tool configs and scripts run in Node, never in Obsidian, and the scanner
  // leaves them out; so do the notes and the build.
  globalIgnores(['node_modules', 'dist', 'SRD 5.2.1', 'scripts', 'postcss', '**/*.cjs']),
  ...recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs', 'eslint.directory.config.mjs'] },
      },
    },
    // Loaded for its rule definitions only: the source's
    // `eslint-disable … react-hooks/…` comments name them, and an unknown rule
    // in a directive is an error. `npm run lint` is where they run.
    plugins: { 'react-hooks': reactHooks },
    // …and since they don't run here, those comments would read as unused.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  { files: ['**/*.{ts,tsx,js,mjs}'], rules: typescriptAsWarnings },
  // `src/derive/` is JavaScript typed by JSDoc under `// @ts-check` (MYDND-209),
  // so its `.js` is held to the scorecard as the TypeScript is. A module that
  // drops its types fails here rather than adding hundreds of Risks to the
  // page. What is out is `*.test.*` alone (above): the harness is out by its
  // files' names, not its folder's, and `__fixtures__` is in.
  {
    files: ['src/**/*.{ts,tsx,js}'],
    ignores: SCANNER_SKIPS,
    rules: {
      ...scorecardAsErrors,
      // `typeof this.update === 'function'` passes obsidianmd's
      // `no-unsupported-api` locally, as a guard, and failed the directory's
      // review as an Error (MYDND-218). Feature-testing a member of `this` is
      // how a subclass of Obsidian's tests for newer API, so it is refused
      // here: `requireApiVersion`, the guard the rule documents, is the form.
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression > UnaryExpression[operator='typeof'] > MemberExpression[object.type='ThisExpression']",
          message:
            "Obsidian's directory does not accept a typeof test as an API guard: use requireApiVersion('<version>') (MYDND-218).",
        },
      ],
    },
  },
  // The description must not open on the plugin's name (MYDND-218);
  // `descriptionProblems` in the preflight throws on it first.
  { files: ['manifest.json'], rules: { 'obsidianmd/validate-manifest': 'error' } },
])
