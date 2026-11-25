// The homebrew domain's host surface (MYDND-233): the builder page, its
// provider, and the plugin's host for it. Imported by the plugin's
// `app/obsidian/hostProviders.tsx` and nothing the web build reaches (ADR 0014,
// `web/noBuilders.test.ts`). Rules: scripts/eslint-domain-order.mjs.

export { type HomebrewPlugin, obsidianHomebrewHost, obsidianImportedNotes } from './obsidian/host'
export { type HomebrewHost, HomebrewProvider, useHomebrew } from './ui/context'
export { NARROW_WIDTH, NoteBuilderPage } from './ui/NoteBuilderPage'
