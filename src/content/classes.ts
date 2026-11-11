import { createCatalog, str, strList, type Catalog, type CatalogRow } from './catalog'
import type { ParseYaml, VaultSource } from './source'

/**
 * Classes and subclasses. **Observed shape** — 60 and 953 real notes.
 *
 * `classes/alchemist-2014.md` carries `hit_die`, `primary_ability` and
 * `saving_throws[]` in frontmatter, and its level progression as a **markdown
 * table** in the body:
 *
 *   | Level | PB | Features | Formulae Known | … |
 *   | 3rd   | +2 | Reagent  | 3              | … |
 *
 * That table is written for a human to read. The Character Builder reads the
 * **` ```vault-class ` fence** instead (MYDND-22), which every class note now
 * ends with: the class as `the-vault`'s `content_class` row and its
 * `content_class_feature` rows, so `@vault/derive` reads one exactly as it read
 * the other. Subclass notes end with ` ```vault-subclass `. The exporter's
 * parity suite (`tests/vaultClassFence.test.ts` in the 5e.tools MCP server)
 * pins the fence against the web builder's own data, and
 * `src/__verify__/realVault.test.ts` checks the real notes carry it.
 * `progressionTable()` remains for displaying the human table, not for rules.
 *
 * `subclasses/*.md` carry `class` (the parent's display name) and
 * `subclass_title` (what the book calls its archetypes — "Archetype", "Circle",
 * "Oath"), which is why `subclassesFor` matches on name rather than an id.
 */
export interface ClassRow extends CatalogRow {
  hitDie: string | null
  primaryAbility: string | null
  savingThrows: string[]
  /** `INT`, from frontmatter; null for a class that does not cast. */
  spellcastingAbility: string | null
  edition: string | null
  tags: string[]
  /** The note's `aliases`; D&D Beyond spells some names the way only an alias does (MYDND-105). */
  aliases: string[]
}

export interface SubclassRow extends CatalogRow {
  /** Parent class's display name, e.g. `Alchemist`. */
  className: string | null
  /** The book's word for its subclasses — "Archetype", "Circle", "Oath". */
  subclassTitle: string | null
  edition: string | null
  tags: string[]
  /** The note's `aliases`; D&D Beyond spells some names the way only an alias does (MYDND-105). */
  aliases: string[]
}

/**
 * One class or subclass feature, as a `content_class_feature` row.
 *
 * `choices` is the builder's input — `{ type: 'asi' }`, `{ type: 'expertise',
 * count: 2 }`, `{ type: 'invocations', options: [...] }` — and its vocabulary is
 * the web builder's (`LevelProgressionAccordions`). `data.optionOf` names the
 * feature this one is an option of (Protector → Divine Order).
 */
export interface FenceFeature {
  name: string
  level: number
  description?: string
  choices?: { type: string; count?: number; options?: unknown[]; [k: string]: unknown }
  /** `effects` since MYDND-26: the-vault's hand-authored effects, on a feature or an option. */
  data?: { optionOf?: string; effects?: unknown[] }
}

/**
 * A class note's ` ```vault-class ` fence — a `content_class` row with its
 * features. `data` is 5e.tools' class object in the shape `the-vault` stores
 * (`skillChoices`, `startingProficiencies`, `startingEquipment`, the class
 * table…), typed loosely on purpose: `@vault/derive` is its reader, and it
 * owns that contract. One spelling is the fence's own: `multiclassProficiencies:
 * { none: true }` means "grants nothing", which an absent key does not.
 */
export interface ClassFence {
  name: string
  source: string
  edition?: string
  hit_die?: number
  spellcasting_ability?: string
  data: Record<string, unknown>
  features: FenceFeature[]
}

/** A subclass note's ` ```vault-subclass ` fence. */
export interface SubclassFence {
  name: string
  short_name?: string
  class_name: string
  class_source: string
  source: string
  data: Record<string, unknown>
  features: FenceFeature[]
}

export type ClassCatalog = Catalog<ClassRow, ClassFence>

export type SubclassCatalog = Catalog<SubclassRow, SubclassFence> & {
  /** Subclasses of one class, by the parent's display name. */
  forClass(className: string): SubclassRow[]
}

export function createClasses(source: VaultSource, parseYaml: ParseYaml): ClassCatalog {
  return createCatalog<ClassRow, ClassFence>(source, parseYaml, {
    folder: 'classes',
    fence: 'vault-class',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        hitDie: str(fm.hit_die),
        // "None" appears literally in the notes for classes without one, and is
        // not a primary ability. Normalising it here keeps the check out of
        // every consumer.
        primaryAbility: normaliseNone(str(fm.primary_ability)),
        savingThrows: strList(fm.saving_throws),
        spellcastingAbility: normaliseNone(str(fm.spellcasting_ability)),
        edition: str(fm.edition),
        tags: strList(fm.tags),
        aliases: strList(fm.aliases),
      }
    },
  })
}

export function createSubclasses(source: VaultSource, parseYaml: ParseYaml): SubclassCatalog {
  const base = createCatalog<SubclassRow, SubclassFence>(source, parseYaml, {
    folder: 'subclasses',
    fence: 'vault-subclass',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        className: str(fm.class),
        subclassTitle: str(fm.subclass_title),
        edition: str(fm.edition),
        tags: strList(fm.tags),
        aliases: strList(fm.aliases),
      }
    },
  })

  return {
    ...base,
    forClass: className => {
      const want = className.trim().toLowerCase()
      return base.list().filter(s => (s.className ?? '').trim().toLowerCase() === want)
    },
  }
}

/**
 * A class note's name with its **edition suffix** removed — `Alchemist (2014)` →
 * `Alchemist`.
 *
 * Needed because the two sides of the class/subclass link are spelled
 * differently. The exporter splits editions into separate notes and marks the
 * older one in its title, but a subclass's `class:` names the class *plainly*:
 * `classes/alchemist-2014.md` is titled `Alchemist (2014)` while
 * `subclasses/alchemist-amorist-2014.md` says `class: "Alchemist"`.
 *
 * **Only a parenthesised year is an edition suffix.** Stripping any trailing
 * parenthetical looks equivalent and is not: `Bender (Air)`, `Bender (Earth)`,
 * `Bender (Fire)` and `Bender (Water)` are four real classes from Ryoko's Guide
 * whose subclasses name them *with* the parenthetical, and flattening all four to
 * `Bender` gave each of them all sixteen of the others' subclasses. Of 28
 * parentheticals across these notes, 23 are `(2014)` and 5 are part of a name.
 */
const EDITION_SUFFIX = /\s*\((?:19|20)\d{2}\)\s*$/

export function baseClassName(name: string): string {
  return name.replace(EDITION_SUFFIX, '').trim()
}

/**
 * The subclasses belonging to one class — **matched on name *and* edition.**
 *
 * `SubclassCatalog.forClass` matches on the name alone, which is faithful to
 * `the-vault`'s `lib/db/` signature but wrong against these notes: `Alchemist`
 * and `Alchemist (2014)` are two class notes, every Alchemist subclass says
 * `class: "Alchemist"`, and so a name-only match gives the 5.5e class all 32 of
 * them and the 2014 class none. 499 of the 953 subclass notes are 5.0e, so this
 * is half the catalog, not an edge case.
 *
 * A subclass may name its class either way — plainly, or with the parenthetical
 * still attached — so both spellings are accepted. Edition is required to agree
 * only when **both** sides state one: a hand-written subclass with no `edition`
 * belongs to whichever class it names rather than to nothing at all.
 *
 * **…and only when the vault holds a class of the subclass's edition.** Pass
 * `classes` (every class row) and a subclass whose own edition has no class of
 * that name joins the one that is there. The vault went 2024-only on 2026-10-09:
 * the 2014 Fighter's note is gone, but 215 of 692 subclasses are 5.0e Loot
 * Tavern ones (`fighter-battlecaller`, `bard-college-of-cuisine`) that matched
 * nothing until MYDND-56. Without `classes` the match stays strict.
 */
export function subclassesOf(
  subclasses: readonly SubclassRow[],
  cls: ClassRow,
  classes?: readonly ClassRow[],
): SubclassRow[] {
  const exact = cls.name.trim().toLowerCase()
  const base = baseClassName(cls.name).toLowerCase()
  const editionsHeld = classes
    ? new Set(classes.filter(c => baseClassName(c.name).toLowerCase() === base).map(c => c.edition))
    : null
  return subclasses.filter(sub => {
    const named = (sub.className ?? '').trim().toLowerCase()
    if (named !== exact && named !== base) return false
    if (!sub.edition || !cls.edition) return true
    if (sub.edition === cls.edition) return true
    return editionsHeld !== null && !editionsHeld.has(sub.edition)
  })
}

/**
 * The raw rows of the first markdown table in a class note — header first, then
 * body rows, each already split on `|` and trimmed. **Deliberately not
 * interpreted**: see the note at the top of this file. `—` is left as written so
 * a caller can tell "no value" from "zero".
 */
export function progressionTable(prose: string): string[][] {
  const rows: string[][] = []
  for (const line of prose.split(/\r?\n/)) {
    const t = line.trim()
    if (!t.startsWith('|')) {
      // Blank lines inside a table are impossible in Markdown, so the first
      // non-pipe line after the table started means the table ended.
      if (rows.length > 0) break
      continue
    }
    const cells = t.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    // The `| :--- | :---: |` alignment row carries no data.
    if (cells.every(c => /^:?-{3,}:?$/.test(c))) continue
    rows.push(cells)
  }
  return rows
}

const normaliseNone = (v: string | null) => (v && /^none$/i.test(v) ? null : v)
