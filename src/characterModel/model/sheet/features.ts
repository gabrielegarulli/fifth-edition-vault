import type { ClassRow, SubclassRow, FeatRow, SpeciesRow } from '../../../compendium'
import { nameKey } from '../../../platform'
import type { Sheet } from './sheet'
import { classesOfSheet } from '../spells/slots'

/**
 * Which notes a character's features are read from (MYDND-50).
 *
 * The sheet names everything it needs: its classes and levels (one hit-die line
 * per class), its subclasses, its species, its feats. The text is the notes' —
 * a class's ` ```vault-class ` fence lists every feature with its level and
 * description, and a subclass's likewise; a species' fence lists its traits; a
 * feat's note *is* its text. So nothing about features is stored on the sheet,
 * and a feature corrected in the catalog is corrected on every sheet.
 *
 * **Matched by name, the 2024 printing first.** A D&D Beyond character has no
 * catalog ids; a Vault character's names are the catalog's own. Both reach the
 * same note this way. Where a class exists in both editions (`bard.md`,
 * `bard-2014.md`), the 5.5e one is taken — the table plays 2024.
 */

export interface ClassSource {
  kind: 'class' | 'subclass'
  id: string
  name: string
  /** The class level that unlocks features up to it. */
  level: number
}

export interface FeatureSources {
  classes: ClassSource[]
  species: SpeciesRow | null
  feats: FeatRow[]
  /** Names the sheet gives that no note answers — reported, not dropped. */
  missing: string[]
}

/**
 * What was picked at one feature of a class (MYDND-53) — `sheet.feature_picks`,
 * matched to a class note's feature by class, name and level.
 *
 * **By name alone when the level disagrees, if only one pick has that name.**
 * D&D Beyond and the class note can file a feature at different levels; a
 * one-off like Magical Discoveries is still unambiguous. Ability Score
 * Improvement is not — it recurs — so it must match its level or show nothing,
 * rather than show the level 4 feat under level 12.
 */
export function picksAt(sheet: Sheet, className: string, feature: string, level: number): string[] {
  const cls = nameKey(className)
  const name = nameKey(feature)
  const same = (Array.isArray(sheet.feature_picks) ? sheet.feature_picks : []).filter(
    p => nameKey(p.class) === cls && nameKey(p.feature) === name,
  )
  const exact = same.find(p => p.level === level)
  if (exact) return exact.picks
  return same.length === 1 ? same[0].picks : []
}

const modern = (edition: string | null): number => (edition === '5.5e' || edition === '2024' ? 1 : 0)

function pick<R extends { name: string; edition: string | null }>(rows: readonly R[], name: string): R | null {
  const key = nameKey(name)
  const hits = rows.filter(r => nameKey(r.name) === key)
  return hits.sort((a, b) => modern(b.edition) - modern(a.edition))[0] ?? null
}

export function featureSources(
  sheet: Sheet,
  catalogs: {
    classes: readonly ClassRow[]
    subclasses: readonly SubclassRow[]
    species: readonly SpeciesRow[]
    feats: { byName(name: string): FeatRow | undefined }
  },
  extraFeats: readonly string[] = [],
): FeatureSources {
  const missing: string[] = []
  const classes: ClassSource[] = []
  const levels = classesOfSheet(sheet)

  for (const { name, level } of levels) {
    const row = pick(catalogs.classes, name)
    if (row) classes.push({ kind: 'class', id: row.id, name: row.name, level })
    else missing.push(name)
  }

  for (const sub of Array.isArray(sheet.subclasses) ? sheet.subclasses : []) {
    const key = nameKey(sub)
    const hits = catalogs.subclasses.filter(r => nameKey(r.name) === key)
    // Disambiguated by parent class where two classes share a subclass name.
    const owner = levels.find(c => hits.some(h => nameKey(h.className ?? '') === nameKey(c.name)))
    const row =
      hits
        .filter(h => !owner || nameKey(h.className ?? '') === nameKey(owner.name))
        .sort((a, b) => modern(b.edition) - modern(a.edition))[0] ?? null
    if (row) classes.push({ kind: 'subclass', id: row.id, name: row.name, level: owner?.level ?? sheet.level ?? 1 })
    else missing.push(sub)
  }

  const species = sheet.race ? pick(catalogs.species, sheet.race) : null
  if (sheet.race && !species) missing.push(sheet.race)

  const names = [...new Set([...(Array.isArray(sheet.feats) ? sheet.feats : []), ...extraFeats])]
  const feats: FeatRow[] = []
  for (const name of names) {
    const row = catalogs.feats.byName(name)
    if (row && !feats.some(f => f.id === row.id)) feats.push(row)
    else if (!row) missing.push(name)
  }

  return { classes, species, feats, missing }
}
