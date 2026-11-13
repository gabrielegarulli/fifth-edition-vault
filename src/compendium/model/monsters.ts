import {
  bool,
  createCatalog,
  num,
  str,
  strList,
  type Catalog,
  type CatalogRow,
  extractFence,
} from '../../platform'
import type { ParseYaml, VaultSource } from '../../platform'

/** The movement modes besides walking, in the order a bestiary card's pips show them. */
export const MOVE_MODES = ['fly', 'swim', 'climb', 'burrow'] as const
export type MoveMode = (typeof MOVE_MODES)[number]

/**
 * The bestiary. **Observed shape**, and the one type whose fence is *not* named
 * `vault-*`.
 *
 * The first 335 notes were imported by hand; the exporter has since brought the
 * folder to 888 (MYDND-31). Every one carries a complete stat block in
 * a ` ```statblock ` fence — AC, HP, hit dice, speed, ability array, saves, skill
 * saves, senses, languages, CR, traits and actions. That fence **is** the
 * structured data this reader needs, so writing a parallel `vault-monster` fence
 * would be a second copy with nothing to keep it honest. Decided 2026-10-03. The
 * format is Fantasy Statblocks', but the plugin is optional: Atlas reads the fence
 * without it (MYDND-176).
 *
 * Note the type collision inherited from `the-vault`: its `monster` table is the
 * append-only *harvest log* with CR as a band (`'3-6'`), while `content_monster`
 * is the *bestiary* with a numeric CR. This is the bestiary. The harvest log is
 * mutable state and belongs to Phase 3.
 */
export interface MonsterRow extends CatalogRow {
  /** Numeric CR — `1/4` arrives as 0.25. See `parseCr`. */
  cr: number | null
  creatureType: string | null
  size: string | null
  edition: string | null
  /** Vault-relative path to the token art, straight from frontmatter. */
  image: string | null
  tags: string[]
  isFamiliar: boolean
  /**
   * The card keys (MYDND-64), copies of the fence's numbers that the exporter
   * flattens into frontmatter so a list never parses a fence. **Null means the
   * note does not say** — a note exported before MYDND-64, or a `special` AC
   * such as "12 + PB" — and is drawn as absent, never as 0.
   */
  xp: number | null
  ac: number | null
  hp: number | null
  /** Walking speed in feet. */
  speed: number | null
  /** Only the modes the exporter knows, in `MOVE_MODES` order. */
  moves: MoveMode[]
  legendary: boolean
  spellcasting: boolean
}

/** The ```statblock fence, as Fantasy Statblocks writes it. */
export interface StatblockFence {
  name?: string
  ac?: number | string
  hp?: number | string
  hit_dice?: string
  speed?: string
  initiative?: string
  /** `[str, dex, con, int, wis, cha]`. */
  stats?: number[]
  /** Each entry is a one-key map, e.g. `{ dexterity: 3 }`. */
  saves?: Array<Record<string, number>>
  skillsaves?: Array<Record<string, number>>
  senses?: string
  passive?: number
  languages?: string
  cr?: number | string
  traits?: Array<{ name?: string; desc?: string }>
  actions?: Array<{ name?: string; desc?: string }>
  [k: string]: unknown
}

export type MonsterCatalog = Catalog<MonsterRow, StatblockFence> & {
  /** Substring match on name, as `monsters.searchByName`. */
  searchByName(term: string, limit?: number): MonsterRow[]
  /** Everything at or below a CR cap — the Wild Shape / familiar query. */
  upToCr(cap: number): MonsterRow[]
  /**
   * A familiar's ` ```vault-companion ` fence, parsed — its improvement tree
   * (MYDND-126). `null` for a note with no such fence or one that will not
   * parse; `choices/model/companion.ts` coerces what is there.
   */
  companion(id: string): Promise<unknown>
}

export function createMonsters(source: VaultSource, parseYaml: ParseYaml): MonsterCatalog {
  const base = createCatalog<MonsterRow, StatblockFence>(source, parseYaml, {
    folder: 'bestiary',
    fence: 'statblock',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null

      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        cr: parseCr(fm.cr),
        creatureType: str(fm.type),
        size: str(fm.size),
        edition: str(fm.edition),
        image: str(fm.image),
        tags: strList(fm.tags),
        isFamiliar: bool(fm.is_familiar),
        xp: num(fm.xp),
        ac: num(fm.ac),
        hp: num(fm.hp),
        speed: num(fm.speed),
        moves: movesOf(fm.moves),
        legendary: bool(fm.legendary),
        spellcasting: bool(fm.spellcasting),
      }
    },
  })

  return {
    ...base,
    searchByName: (term, limit = 20) => {
      const want = term.trim().toLowerCase()
      if (!want) return []
      return base
        .list()
        .filter(m => m.name.toLowerCase().includes(want))
        .slice(0, limit)
    },
    // A monster with no CR is excluded rather than treated as CR 0: an unparsed
    // CR must not make something eligible for a Wild Shape cap it never met.
    upToCr: cap => base.list().filter(m => m.cr !== null && m.cr <= cap),
    companion: async id => {
      const row = base.list().find(m => m.id === id)
      if (!row) return null
      const raw = extractFence(await source.readBody(row.path), 'vault-companion')
      if (raw === null) return null
      try {
        return parseYaml(raw)
      } catch {
        return null
      }
    },
  }
}

/**
 * `moves: [fly, climb]` → the known modes, in pip order. Case-folded because a
 * human may retype one in Obsidian's Properties UI; an unknown mode is dropped
 * rather than drawn as a pip nothing filters on.
 */
export function movesOf(v: unknown): MoveMode[] {
  const given = new Set(strList(v).map(s => s.toLowerCase()))
  return MOVE_MODES.filter(mode => given.has(mode))
}

/**
 * A challenge rating, which **is not a number in these notes.**
 *
 * The three fractional CRs are written in the game's own notation and unquoted —
 * `cr: 1/4` — so YAML hands over the *string* `"1/4"` and `Number()` makes `NaN`
 * of it. That silently emptied the CR of **78 of 336 bestiary notes**: a quarter
 * of the bestiary showed `CR —`, and every one of them was missing from a "CR 5
 * or lower" filter, which is the single query the column exists to answer. The
 * fixture had `cr: 10` and `cr: "10"` and so proved only the easy half.
 *
 * Accepted: `2`, `"2"`, `1/4`, `"1/2"`, and `—` or anything unreadable as `null`.
 * Four notes genuinely carry `cr: —`, which is a monster with no CR rather than a
 * parse failure, and null is the right answer for both.
 *
 * Ryoko's legendary creatures print two CRs in one string — `4 (CR 3 without
 * legendary actions)`. The leading number is the creature as written, so that
 * is the one read (MYDND-31, when the full source scope was first exported).
 */
export function parseCr(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null

  const text = v.trim()
  if (text === '') return null

  const qualified = /^(\d+(?:\s*\/\s*\d+)?)\s*\(/.exec(text)
  if (qualified) return parseCr(qualified[1])

  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }

  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** `[str, dex, con, int, wis, cha]` → the ability keys the derive library uses. */
export function abilitiesOf(fence: StatblockFence | null): Record<string, number> | null {
  const stats = fence?.stats
  if (!Array.isArray(stats) || stats.length !== 6) return null
  const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
  return Object.fromEntries(keys.map((k, i) => [k, stats[i]]))
}

/** Flattens `[{dexterity: 3}, {wisdom: 6}]` into `{dexterity: 3, wisdom: 6}`. */
export function flattenSaves(
  entries: Array<Record<string, number>> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const entry of entries ?? []) {
    for (const [k, v] of Object.entries(entry ?? {})) {
      if (typeof v === 'number') out[k] = v
    }
  }
  return out
}
