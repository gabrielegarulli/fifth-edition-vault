import { bool, createCatalog, num, str, strList, type Catalog, type CatalogRow } from '../../platform'
import type { ParseYaml, VaultSource } from '../../platform'

/**
 * Spells. **Observed shape** — built against 1785 real notes whose frontmatter
 * was uniform across 200 sampled, varying only in `classes` (196/200).
 *
 * `spells/abduct-2014.md`:
 *
 *   title, source, edition, level, school, casting_time, range, components,
 *   duration, concentration, ritual, classes[], tags[], aliases[]
 *
 * Everything `SpellsPage` filters on is already flat here — level, school,
 * concentration, ritual, text — with one exception. It also filters the list on
 * `spell.data?.damageTypes`, which is deep. That becomes `damage_types`, a
 * **derived key**: the exporter computes it and nothing may hand-edit it. Until
 * the exporter emits it, `damageTypes` is simply empty and the filter is inert
 * rather than broken.
 */
export interface SpellRow extends CatalogRow {
  level: number
  school: string | null
  castingTime: string | null
  range: string | null
  components: string | null
  duration: string | null
  concentration: boolean
  ritual: boolean
  edition: string | null
  /** Class *names*. The web app returns `{id, name}` from a join table; the
   *  vault has no join table and no uuids, so the name is the identity. */
  classes: string[]
  /**
   * The Bender's elements whose lists hold this spell (MYDND-124) — `Air`,
   * `Earth`, `Fire`, `Water`. Empty for every other spell. A Bender is offered
   * only the elements its Elemental Affinity picks name; see
   * `choices/model/choices.ts`' `affinityPicks`.
   */
  affinities: string[]
  /** Derived. Empty until the exporter emits `damage_types`. */
  damageTypes: string[]
  /**
   * The dice the spell rolls (MYDND-49) — derived keys the spell exporter writes
   * from 5e.tools (`mcp-server` `scripts/lib/spellDice.ts`). All null on a note
   * exported before that, which the Cast button reads as "nothing to roll".
   */
  damageDice: string | null
  healDice: string | null
  /** The heal adds the caster's spellcasting modifier. */
  healMod: boolean
  /** What each rank above the spell's own adds. */
  upcastDice: string | null
  /** A cantrip's dice at character levels 1, 5, 11, 17; `''` adds nothing. */
  cantripDice: string[]
  tags: string[]
}

/** The ```vault-spell fence. Not yet emitted by any exporter. */
export interface SpellFence {
  upcast?: string
  damage_types?: string[]
  [k: string]: unknown
}

export type SpellCatalog = Catalog<SpellRow, SpellFence> & {
  /** Spells at a given level. */
  atLevel(level: number): SpellRow[]
  /** Spells on one class's list, by class name. */
  forClass(className: string): SpellRow[]
  /** The de-duplicated union of several classes' lists, as `spells.forClasses`. */
  forClasses(classNames: string[]): SpellRow[]
}

export function createSpells(source: VaultSource, parseYaml: ParseYaml): SpellCatalog {
  const base = createCatalog<SpellRow, SpellFence>(source, parseYaml, {
    folder: 'spells',
    fence: 'vault-spell',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      // A spell with no title is a template or a stray file. Excluded rather
      // than surfaced as a nameless row that sorts to the top of the catalog.
      if (!name) return null

      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        // Cantrips are level 0, so `?? null` would be wrong and `|| 0` would
        // turn a missing level into a cantrip. Absent means absent.
        level: num(fm.level) ?? -1,
        school: str(fm.school),
        castingTime: str(fm.casting_time),
        range: str(fm.range),
        components: str(fm.components),
        duration: str(fm.duration),
        concentration: bool(fm.concentration),
        ritual: bool(fm.ritual),
        edition: str(fm.edition),
        classes: strList(fm.classes),
        affinities: strList(fm.affinities),
        damageTypes: strList(fm.damage_types),
        damageDice: str(fm.damage_dice),
        healDice: str(fm.heal_dice),
        healMod: bool(fm.heal_mod),
        upcastDice: str(fm.upcast_dice),
        // Not `strList`: a tier that adds nothing is `""`, and the position is
        // the tier, so an empty string must survive rather than be filtered.
        cantripDice: Array.isArray(fm.cantrip_dice) ? fm.cantrip_dice.map(d => (typeof d === 'string' ? d : '')) : [],
        tags: strList(fm.tags),
      }
    },
  })

  const byLevelThenName = (a: SpellRow, b: SpellRow) =>
    a.level - b.level || a.name.localeCompare(b.name)

  const forClasses = (classNames: string[]): SpellRow[] => {
    const want = new Set(classNames.map(c => c.trim().toLowerCase()).filter(Boolean))
    if (want.size === 0) return []
    return base
      .list()
      .filter(s => s.classes.some(c => want.has(c.trim().toLowerCase())))
      .sort(byLevelThenName)
  }

  return {
    ...base,
    // `the-vault` orders spells by level then name; the generic catalog sorts by
    // name alone, so this type overrides it.
    list: () => base.list().sort(byLevelThenName),
    atLevel: level => base.list().filter(s => s.level === level).sort(byLevelThenName),
    forClass: className => forClasses([className]),
    forClasses,
  }
}
