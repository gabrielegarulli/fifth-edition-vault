import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const MAIN_PATH = path.resolve(__dirname, '../dist/main.js')

/**
 * Guards on the **built** `dist/main.js` (MYDND-141), like `styles.test.ts` on
 * the stylesheet: CI builds before it tests, and so must you.
 *
 * Vite's lib mode does not replace `process.env.NODE_ENV`, and React picks its
 * build from it at runtime. Obsidian sets none, so until MYDND-141 every
 * release carried both of React's builds (1.66 MB) and ran the development one.
 * `vite.config.mts` defines it now (1.23 MB), and this is what keeps it so.
 */
function readMain(): string {
  if (!fs.existsSync(MAIN_PATH)) {
    throw new Error('dist/main.js is missing — these guards assert the BUILT plugin; run `npm run build` first.')
  }
  return fs.readFileSync(MAIN_PATH, 'utf8')
}

describe('bundle guards (MYDND-141)', () => {
  it('decides nothing at runtime on process.env.NODE_ENV', () => {
    expect(readMain()).not.toMatch(/process\.env\.NODE_ENV/)
  })

  it("carries React's production build only", () => {
    // Strings that exist only in the development builds of react-dom and React.
    const main = readMain()
    expect(main).not.toMatch(/react-stack-bottom-frame/)
    expect(main).not.toMatch(/__REACT_DEVTOOLS_GLOBAL_HOOK__\.registerInternalModuleStart/)
  })
})
