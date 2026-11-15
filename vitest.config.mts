import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'
import { srdNotesPlugin } from './scripts/srd-pack.mjs'

const root = import.meta.dirname

// The harness is named `*.stub.test.*`, so Obsidian's directory scanner skips it
// as it skips a test (MYDND-218), and neither project collects it as one.
const exclude = [...configDefaults.exclude, 'src/**/*.stub.test.*']

const alias = {
  '@vault/derive': path.resolve(root, 'src/derive'),
  '@': path.resolve(root, 'src'),
}

// The packed notes are `null` in tests; `src/compendium/store/srd/seed.test.ts` packs its own.
const srdNotes = srdNotesPlugin(false, root)
const define = { 'import.meta.env.SRD_ONLY': 'true' }

/**
 * Two projects, split by file extension.
 *
 * **`logic`, `*.test.ts`, Node, with `obsidian` unresolvable on purpose**: the
 * content and state layers import nothing from it, and a test that pulled it in
 * would fail to resolve it.
 *
 * **`ui`, `*.test.tsx`, jsdom, `obsidian` aliased to `src/test-support/`**, so a
 * page can be mounted and a component that throws on first render fails here.
 */
export default defineConfig({
  plugins: [srdNotes],
  define,
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [srdNotes],
        define,
        resolve: { alias },
        test: { name: 'logic', include: ['src/**/*.test.ts'], exclude, environment: 'node' },
      },
      {
        plugins: [srdNotes],
        define,
        resolve: { alias: { ...alias, obsidian: path.resolve(root, 'src/test-support/obsidian.stub.test.ts') } },
        test: {
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          exclude,
          environment: 'jsdom',
          setupFiles: [path.resolve(root, 'src/test-support/setup.stub.test.ts')],
        },
      },
    ],
  },
})
