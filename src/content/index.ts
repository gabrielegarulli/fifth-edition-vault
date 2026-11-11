import { createBackgrounds, createSpecies } from './lineage'
import { createCharacters } from './characters'
import { createClasses, createSubclasses } from './classes'
import { createConditions } from './conditions'
import { createFeats } from './feats'
import { createItems, createMagicItems } from './items'
import { createMonsters } from './monsters'
import { createSpells } from './spells'
import type { RuleFolderKey } from './folders'
import type { ParseYaml, VaultSource } from './source'
import { itemDataSource } from '../sheet/equipment'

/**
 * The content layer — what replaces `the-vault`'s 42 `lib/db/` modules.
 *
 * **This module imports nothing from `obsidian`, and must not start.** The
 * `obsidian` npm package is types-only: it ships `obsidian.d.ts` and no runtime
 * entry, because the real module is injected by the app. So importing a *value*
 * from it — `parseYaml`, a class — makes the importing file unloadable outside
 * Obsidian, and that propagates to everything that imports it.
 *
 * That is why the Obsidian wrapper lives in `./obsidian` rather than here: this
 * file stays loadable in plain Node, so the whole content layer is testable
 * against a fixture vault with no stubs and no aliases. The resolution error is
 * a useful guard — if it ever appears again, something has pulled Obsidian into
 * testable code.
 *
 * `type`-only imports are fine anywhere; they vanish at compile time.
 */
export function createContent(source: VaultSource, parseYaml: ParseYaml) {
  // Named, because the roster reads the worn items' notes through them (MYDND-57).
  const items = createItems(source, parseYaml)
  const magicItems = createMagicItems(source, parseYaml)
  return {
    // Observed shapes — real notes on disk.
    spells: createSpells(source, parseYaml),
    monsters: createMonsters(source, parseYaml),
    classes: createClasses(source, parseYaml),
    subclasses: createSubclasses(source, parseYaml),
    conditions: createConditions(source, parseYaml),

    // Designed shapes — no notes yet; these specify what the exporter must
    // emit. Each one's `list()` is simply empty until its folder exists, which
    // is the correct behaviour: a catalog with no content is not an error.
    feats: createFeats(source, parseYaml),
    items,
    magicItems,
    species: createSpecies(source, parseYaml),
    backgrounds: createBackgrounds(source, parseYaml),

    // **Not a catalog**, and deliberately absent from `CATALOG_KEYS` below. A
    // character is any note carrying `vc_ddb_id`, not the contents of a folder,
    // so it has no `list()/detail()` pair and no row count to report alongside
    // "1,785 spells". See `./characters.ts` (MYDND-7).
    characters: createCharacters(source, parseYaml, itemDataSource({ items, magicItems })),

    /**
     * Where a rules folder is in this vault, for a sentence that names it — an
     * empty state, a "no note in …" hint (MYDND-184). Never for building a path
     * to read: the readers go through `source.notesIn`.
     */
    ruleFolder: (key: RuleFolderKey): string => source.folderFor?.(key) ?? key,
  }
}

export type Content = ReturnType<typeof createContent>

/** Every catalog's key, in the order a status display should list them. */
export const CATALOG_KEYS = [
  'spells',
  'monsters',
  'classes',
  'subclasses',
  'conditions',
  'feats',
  'items',
  'magicItems',
  'species',
  'backgrounds',
] as const satisfies ReadonlyArray<keyof Content>

export type CatalogKey = (typeof CATALOG_KEYS)[number]

/** Row counts per catalog. The cheap, honest way to show what the vault holds. */
export function catalogCounts(content: Content): Record<CatalogKey, number> {
  const out = {} as Record<CatalogKey, number>
  for (const key of CATALOG_KEYS) out[key] = content[key].list().length
  return out
}

export type { Catalog, CatalogRow, Detail } from './catalog'
export type { NoteRef, ParseYaml, VaultSource } from './source'
export type { InitiativeResult, Roster, RosterEntry } from './characters'
export {
  DDB_ID_KEY,
  filterRoster,
  formatRelativeTime,
  initiativeOrder,
  isCharacterNote,
} from './characters'
export { abilitiesFromFence } from './feats'
export { abilitiesOf, flattenSaves, parseCr } from './monsters'
export { baseClassName, progressionTable, subclassesOf } from './classes'
export { extractFence, proseOf } from './fence'
