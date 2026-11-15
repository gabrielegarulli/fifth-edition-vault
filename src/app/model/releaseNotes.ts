/**
 * Every `changelog/<version>.md`, bundled into `main.js` (MYDND-215).
 *
 * `import.meta.glob` is Vite's, and Vitest's: the files become strings at build
 * time, so What's new never fetches anything. Only `app/obsidian/updates.ts`
 * imports this, and only the SRD edition builds that, so the full plugin's
 * bundle carries no notes. The SRD export follows this glob as it follows an
 * import (`scripts/srd-plugin/export.mjs`), so the public repository gets the
 * files and its own build finds them at the same path.
 *
 * **Nothing here runs at the top level.** A parse there was a call the bundler
 * must keep, which kept every note in the full plugin's `main.js` with the
 * class that reads them gone (`bundle.test.ts` caught it). So the parse is a
 * function, run on first use.
 */
import { readReleases, type ReleaseNotes } from './changelog'

/** Path → text, for the test that holds each file to the format. */
export const RELEASE_FILES: Record<string, string> = import.meta.glob('../../../changelog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

let parsed: readonly ReleaseNotes[] | null = null

/** Newest first. A file that breaks the format is left out; `releaseNotes.test.ts` fails on it. */
export function releases(): readonly ReleaseNotes[] {
  parsed ??= readReleases(RELEASE_FILES)
  return parsed
}
