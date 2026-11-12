// What Obsidian's community directory lints this repository with (MYDND-187).
//
//   npm run lint:directory     # errors only, as CI runs it
//
// The directory's automated review runs eslint-plugin-obsidianmd's recommended
// config over the source and fails a release on any of its errors. Its warnings
// (thousands, most in the untyped `src/derive/` library) do not fail a review,
// so CI runs this with `--quiet`: it fails on exactly what would fail the
// review, and `npm run lint` stays the project's own, stricter-in-other-ways
// lint. Tests and tool configs get the plugin's own exemptions, as the scanner
// gives them.
import { defineConfig, globalIgnores } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'
import reactHooks from 'eslint-plugin-react-hooks'

const recommended = obsidianmd.configs.recommended

// The scanner reports typescript-eslint's type-checked rules as warnings
// (unbound-method, no-unnecessary-type-assertion, no-unsafe-*), where the
// recommended config makes some of them errors. Warnings here, as there.
const typescriptAsWarnings = Object.fromEntries(
  [...new Set(recommended.flatMap(c => Object.keys(c.rules ?? {})))]
    .filter(rule => rule.startsWith('@typescript-eslint/'))
    .map(rule => [rule, 'warn']),
)

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
])
