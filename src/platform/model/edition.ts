/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly SRD_ONLY?: true
  }
}

/** The SRD's source key, and the folder its notes sit under (`SRD_RULES_FOLDER`). */
const SRD = 'SRD 5.2.1'

/** The plugin's name: the bar, Home, a fresh tab, a new campaign note, the Atlas template. */
export const PLUGIN_TITLE = 'Fifth Edition Vault'

export const OMITTED_PAGES: ReadonlySet<string> = new Set(['/harvesting', '/crafting'])

/**
 * Where the rules folders sit by default (`DEFAULT_NOTE_FOLDERS.rulesRoot`):
 * the SRD edition's notes all go under one folder (MYDND-180); the full plugin
 * reads the lore vault, whose folders are at the top.
 */
export const DEFAULT_RULES_ROOT = SRD

/**
 * The campaign note's line for the crafting rule that only the full plugin
 * has, with its newline; empty in the SRD edition (`platform/store/campaigns`).
 */
export const QUIRK_COSTS_NOTE_LINE = ''

/**
 * Sources whose items the starting-equipment resolver files under
 * `@vault/derive`'s `PREFERRED_SOURCE` (`choices/model/choices/equipment`).
 * The SRD edition's `PREFERRED_SOURCE` is the SRD, so it maps nothing.
 */
export const PREFERRED_ITEM_SOURCES: ReadonlySet<string> = new Set([])

/**
 * The two printings of the core rules, for the classes page's shelves
 * (`compendium/model/classShelves`). In the SRD edition every note says
 * `SRD 5.2.1` (MYDND-170), which without this would shelve as third-party.
 */
export const CORE_CLASS_SOURCES: ReadonlySet<string> = new Set([SRD])

/**
 * Books Wizards of the Coast publishes, by the exporter's source code, for the
 * classes page's shelves. Unlisted is third-party. The SRD edition names none.
 */
export const OFFICIAL_CLASS_SOURCES: ReadonlySet<string> = new Set([])

/**
 * A source's title, for people (MYDND-163, `catalogs/model/sourceNames`). The
 * titles are 5etools' own, from `data/books.json`, `data/adventures.json` and
 * each homebrew file's `_meta.sources`, not typed from memory.
 *
 * **The SRD edition carries no book's title** (MYDND-170). Its notes all say
 * `SRD 5.2.1`, which is already a title, and `check-srd-bundle.mjs` fails on the
 * books' names.
 */
export const OFFICIAL_SOURCE_TITLES: Readonly<Record<string, string>> = {}

/** Third-party books' titles, as `OFFICIAL_SOURCE_TITLES`. */
export const THIRD_PARTY_SOURCE_TITLES: Readonly<Record<string, string>> = {}
