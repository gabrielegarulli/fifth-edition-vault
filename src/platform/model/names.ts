/**
 * How a name a character carries is compared with a name a note carries.
 * MYDND-40.
 *
 * Two spellings of the same name reach this side:
 *
 * - **The apostrophe.** D&D Beyond writes the typographic `’`; the exporter
 *   writes the ASCII `'`. `nameKey` folds the typographic quotes to ASCII before
 *   comparing, so `Kitsune’s Blessing` meets `Kitsune's Blessing`.
 * - **The slug.** The exporter's `toSlug` (`mcp-server/scripts/lib/loreExport.ts`)
 *   *deletes* apostrophes before hyphenating — `Cat's Caress` is
 *   `cats-caress.md`. This side used to *hyphenate* them (`cat-s-caress`), so a
 *   feat's filename pass could never match an apostrophe name, and three of the
 *   four exported feats with one printed as `unknown` on the sheet.
 *
 * `noteSlugs` therefore gives **both** readings: the exporter's, which is what
 * every generated filename is, and the separator reading, which is what a GM's
 * hand-named `fell-handed.md` expects of `Fell'Handed`. Both are exact; neither
 * is fuzzy. Change the exporter's rule and the first one here changes with it —
 * the cross-repo contract is written down in `docs/lessons/content-layer.md`.
 */

/** `’ ‘ ʼ` to `'`, and `“ ”` to `"`. */
export function foldQuotes(s: string): string {
  return s.replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"')
}

/** The key two names are compared on: quotes folded, trimmed, lowercased. */
export function nameKey(s: string): string {
  return foldQuotes(s).trim().toLowerCase()
}

/** The exporter's `toSlug`, byte for byte, after folding the quotes. */
export function exporterSlug(s: string): string {
  return foldQuotes(s)
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Every run of non-alphanumerics, apostrophes included, as one hyphen. */
function separatorSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The filename slugs a name could have been written under — one or two, never empty. */
export function noteSlugs(s: string): string[] {
  return [...new Set([exporterSlug(s), separatorSlug(s)])].filter(x => x !== '')
}
