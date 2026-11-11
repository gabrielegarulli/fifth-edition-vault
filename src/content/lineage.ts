import { resolveToolSlug } from '@vault/derive/tools.js'

import { createCatalog, num, str, strList, type Catalog, type CatalogRow } from './catalog'
import type { ParseYaml, VaultSource } from './source'

/**
 * Species and backgrounds. **DESIGNED SHAPES — no notes exist yet.**
 *
 * `content_race` and `content_background` are both just `(name, source_slug,
 * data jsonb)`, so there is nothing observed to model frontmatter on beyond name
 * and source. The keys below are the minimum a Character Builder list needs to
 * filter without opening a fence; everything else goes in the fence.
 *
 * Called "species" in 5.5e and in the builder's own language, while the table is
 * still `content_race`. The reader is `species`, the folder is `species/`, and
 * the DB name is left behind deliberately — see `the-vault`'s
 * `docs/lessons/characters.md` on species resolution.
 */

export interface SpeciesRow extends CatalogRow {
  /** Small / Medium / Large. A list filter, hence frontmatter. */
  size: string | null
  /** In feet. The builder shows it in the species list. */
  speed: number | null
  /**
   * In feet, or null. Frontmatter rather than fence because the exporter
   * already writes it there, and because a Vault character's bake turns it into
   * a `sense` effect without opening the note (MYDND-23).
   */
  darkvision: number | null
  /**
   * The parent species note that offers this subrace as a lineage, or null.
   * The builder's picker hides an offered subrace — it is chosen through its
   * parent's lineage question, carrying its own traits and spells (MYDND-30).
   */
  offeredBy: string | null
  edition: string | null
  tags: string[]
  /** The note's `aliases`; D&D Beyond spells some names the way only an alias does (MYDND-105). */
  aliases: string[]
}

export interface BackgroundRow extends CatalogRow {
  /** The 2024 backgrounds grant a feat by name; the list shows it. */
  originFeat: string | null
  /** Ability keys the background can raise, lowercase. Derived. */
  abilities: string[]
  /**
   * Skills the background fixes — `content_background.data.skillProficiencies`,
   * verbatim slugs (`sleight of hand`). Only the choice-free case; a background
   * that lets the player pick leaves this empty (MYDND-31).
   */
  skillProficiencies: string[]
  /**
   * Tools the background fixes, as `@vault/derive/tools.js` slugs (MYDND-171).
   * Only in the note's fence, so a list row has none: the builder lays them on
   * the picked background with `backgroundToolsOf`, as it does this next one.
   */
  tools?: string[]
  /** Tools the player picks, by kind: the Soldier's "one kind of Gaming Set". */
  toolChoices?: ToolChoice[]
  edition: string | null
  tags: string[]
  /** The note's `aliases`; D&D Beyond spells some names the way only an alias does (MYDND-105). */
  aliases: string[]
}

/** A background's "choose a tool" line: which kind, and how many. */
export interface ToolChoice {
  category: 'gaming' | 'artisan' | 'instrument'
  count: number
}

const TOOL_CHOICE_KEYS: Record<string, ToolChoice['category']> = {
  anyGamingSet: 'gaming',
  anyArtisansTool: 'artisan',
  anyMusicalInstrument: 'instrument',
}

/**
 * A background fence's `tool_proficiencies`, as the exporter copies them from
 * 5e.tools: a list of one-key maps, `calligrapher's supplies: true` or `anyGamingSet: 1`.
 * A name the tool vocabulary does not know is left out.
 */
export function backgroundToolsOf(value: unknown): { tools: string[]; toolChoices: ToolChoice[] } {
  const tools: string[] = []
  const toolChoices: ToolChoice[] = []
  for (const entry of Array.isArray(value) ? value : []) {
    if (!entry || typeof entry !== 'object') continue
    for (const [key, given] of Object.entries(entry as Record<string, unknown>)) {
      const category = TOOL_CHOICE_KEYS[key]
      if (category) toolChoices.push({ category, count: Math.max(1, Number(given) || 1) })
      else if (given === true) {
        const slug = resolveToolSlug(key) as string | null
        if (slug) tools.push(slug)
      }
    }
  }
  return { tools, toolChoices }
}

export interface LineageFence {
  description?: string
  traits?: Array<{ name?: string; text?: string; effects?: Array<Record<string, unknown>> }>
  /** Raw 5e.tools `startingEquipment` blocks on a `vault-background` fence (MYDND-174). */
  starting_equipment?: unknown
  [k: string]: unknown
}

export type SpeciesCatalog = Catalog<SpeciesRow, LineageFence>
export type BackgroundCatalog = Catalog<BackgroundRow, LineageFence> & {
  /** Backgrounds that can raise a given ability, by lowercase key. */
  grantingAbility(ability: string): BackgroundRow[]
}

export function createSpecies(source: VaultSource, parseYaml: ParseYaml): SpeciesCatalog {
  return createCatalog<SpeciesRow, LineageFence>(source, parseYaml, {
    folder: 'species',
    fence: 'vault-species',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        size: str(fm.size),
        speed: numericSpeed(fm.speed),
        darkvision: num(fm.darkvision),
        offeredBy: str(fm.offered_by),
        edition: str(fm.edition),
        tags: strList(fm.tags),
        aliases: strList(fm.aliases),
      }
    },
  })
}

export function createBackgrounds(source: VaultSource, parseYaml: ParseYaml): BackgroundCatalog {
  const base = createCatalog<BackgroundRow, LineageFence>(source, parseYaml, {
    folder: 'backgrounds',
    fence: 'vault-background',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        originFeat: str(fm.origin_feat),
        abilities: strList(fm.abilities).map(a => a.toLowerCase()),
        skillProficiencies: strList(fm.skill_proficiencies).map(s => s.toLowerCase()),
        edition: str(fm.edition),
        tags: strList(fm.tags),
        aliases: strList(fm.aliases),
      }
    },
  })

  return {
    ...base,
    grantingAbility: ability => {
      const want = ability.trim().toLowerCase()
      return base.list().filter(b => b.abilities.includes(want))
    },
  }
}

/**
 * `30`, `"30"` and `"30 ft."` all mean 30 feet. The existing bestiary notes
 * write speed as prose (`10 ft., Swim 40 ft.`), so a species exporter will
 * plausibly do the same and a bare `num()` would silently return null.
 */
function numericSpeed(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = str(v)
  if (!s) return null
  const m = /(\d+)/.exec(s)
  return m ? Number(m[1]) : null
}
