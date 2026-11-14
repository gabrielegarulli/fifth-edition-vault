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
// and tool configs get the plugin's own exemptions, as the scanner gives them.
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
// obsidianmd's own rules, every one it switches on, except
// `validate-manifest`, which stays a warning: the description starts with the
// plugin's name, because Atlas VTT's brand guidelines require that it does.
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
// The files the directory's scanner does not lint at all (its `ignores.json`):
// tests by name (`*.test.*`, `test-support/`, `__mocks__/`, …), tool configs
// and `scripts/`. obsidianmd carries the list on every block of its runtime
// rules, the ones for window-only rules adding worker files, so what they all
// share is the scanner's list. Read here rather than copied, because a copy
// drifted (MYDND-214): it skipped `__fixtures__/` and the old
// `src/__harness__/`, both of which the scanner lints. A plugin that stops
// carrying the list fails this config, not the review.
const ignoreLists = recommended
  .filter(c => c.ignores?.length && Object.keys(c.rules ?? {}).some(rule => rule.startsWith('obsidianmd/')))
  .map(c => c.ignores)
const notRunInObsidian = ignoreLists.length
  ? ignoreLists.reduce((shared, list) => shared.filter(glob => list.includes(glob)))
  : []
if (!notRunInObsidian.some(glob => glob.includes('test'))) {
  throw new Error("eslint.directory.config.mjs: obsidianmd's recommended config no longer carries the scanner's test ignores")
}

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
  // page. What is out is exactly what the scanner leaves out (above), so
  // `src/test-support/` is out by its name and `__fixtures__` is in.
  {
    files: ['src/**/*.{ts,tsx,js}'],
    ignores: notRunInObsidian,
    rules: scorecardAsErrors,
  },
])
