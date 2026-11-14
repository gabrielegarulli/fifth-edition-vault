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
// obsidianmd's own rules, every one it switches on, except three, which stay
// warnings:
//
// - `validate-manifest`: the description starts with the plugin's name,
//   because Atlas VTT's brand guidelines require that it does.
// - The settings tab's two: `display()` is deprecated in favour of
//   `getSettingDefinitions()`, which needs Obsidian 1.13 against a
//   minAppVersion of 1.11.4. The same `display()` is why no-deprecated is not
//   among the errors either, and the plugin's own directives may not disable
//   any of them.
const SCORECARD_TYPESCRIPT = [
  'no-unsafe-argument',
  'no-unsafe-assignment',
  'no-unsafe-call',
  'no-unsafe-member-access',
  'no-unsafe-return',
  'unbound-method',
  'no-unnecessary-type-assertion',
]
const SETTINGS_SEARCH = ['obsidianmd/settings-tab/prefer-setting-definitions', 'obsidianmd/settings-tab/no-deprecated-display']
const scorecardAsErrors = Object.fromEntries([
  ...SCORECARD_TYPESCRIPT.map(rule => [`@typescript-eslint/${rule}`, 'error']),
  ...[...enabledRules]
    .filter(rule => rule.startsWith('obsidianmd/') && !SETTINGS_SEARCH.includes(rule) && rule !== 'obsidianmd/validate-manifest')
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
  // page. Tests and the harness are out: the harness *is* Obsidian's DOM
  // helpers, built on `document`, and jsdom has no `activeDocument` to use
  // instead.
  {
    files: ['src/**/*.{ts,tsx,js}'],
    ignores: ['**/*.test.{ts,tsx,js}', 'src/__harness__/**', 'src/__verify__/**', '**/__fixtures__/**'],
    rules: scorecardAsErrors,
  },
])
