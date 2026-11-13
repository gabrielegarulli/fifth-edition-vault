import { createBackgrounds, createSpecies } from './lineage'
import { createClasses, createSubclasses } from './classes'
import { createConditions } from './conditions'
import { createFeats } from './feats'
import { createItems, createMagicItems } from './items'
import { createMonsters } from './monsters'
import { createSpells } from './spells'
import type { RuleFolderKey, ParseYaml, VaultSource } from '../../platform'

/**
 * The compendium: the ten rules readers and nothing else (MYDND-199).
 *
 * Split out of `createContent` so the domain that reads rules has a factory of
 * its own, below everything that uses one. `createContent` (in `./index`, the
 * app's composition) is this plus the roster; a spell window or a card that
 * only links spell names builds just this.
 *
 * **Imports nothing from `obsidian`**, for the reason `./index` gives: the
 * `obsidian` package has no runtime entry, so a value import would make every
 * reader unloadable in plain Node. The Obsidian wrapper is `./obsidian`.
 */
export function createCompendium(source: VaultSource, parseYaml: ParseYaml) {
  return {
    // Observed shapes — real notes on disk.
    spells: createSpells(source, parseYaml),
    monsters: createMonsters(source, parseYaml),
    classes: createClasses(source, parseYaml),
    subclasses: createSubclasses(source, parseYaml),
    conditions: createConditions(source, parseYaml),

    // Designed shapes — these specify what the exporter must emit. Each one's
    // `list()` is simply empty until its folder exists, which is the correct
    // behaviour: a catalog with no content is not an error.
    feats: createFeats(source, parseYaml),
    items: createItems(source, parseYaml),
    magicItems: createMagicItems(source, parseYaml),
    species: createSpecies(source, parseYaml),
    backgrounds: createBackgrounds(source, parseYaml),

    /**
     * Where a rules folder is in this vault, for a sentence that names it — an
     * empty state, a "no note in …" hint (MYDND-184). Never for building a path
     * to read: the readers go through `source.notesIn`.
     */
    ruleFolder: (key: RuleFolderKey): string => source.folderFor?.(key) ?? key,
  }
}

export type Compendium = ReturnType<typeof createCompendium>

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
] as const satisfies ReadonlyArray<keyof Compendium>

export type CatalogKey = (typeof CATALOG_KEYS)[number]

/** Row counts per catalog. The cheap, honest way to show what the vault holds. */
export function catalogCounts(compendium: Compendium): Record<CatalogKey, number> {
  const out = {} as Record<CatalogKey, number>
  for (const key of CATALOG_KEYS) out[key] = compendium[key].list().length
  return out
}
