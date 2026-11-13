// The domain order, bottom to top. Every folder under `src/` is a domain, and
// a domain may import only from domains below it here, through their
// `index.ts` (pure) or `host.ts` (React and Obsidian).
// `scripts/eslint-domain-order.mjs` enforces it on every import.
//
// One tier per row; domains sharing a row are peers.
export const ORDER = [
  ['derive'],
  ['platform'],
  ['compendium'],
  ['dice'],
  ['characterModel'],
  ['choices'],
  ['spellEffects'],
  ['characters'],
  ['builder'],
  ['catalogs'],
  ['gm'],
  ['app'],
]
