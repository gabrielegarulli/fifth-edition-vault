/**
 * Display vocabulary for the catalogs — the lookup tables `the-vault` keeps in
 * Postgres (`damage_type`, `rarity`, `content_item_type`) and in each page's
 * constants.
 *
 * Here they are constants, because the vault has no lookup tables and inventing
 * notes for them would be inventing content. Where a value arrives unrecognised
 * it is shown **as written** rather than hidden: these notes carry homebrew from
 * twenty-odd books, and a closed vocabulary would silently drop the long tail.
 */

/** Spell levels. 0 is `Cantrip`, not `0th`. */
export const SPELL_LEVEL_LABELS: Record<number, string> = {
  0: 'Cantrip',
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
  6: '6th',
  7: '7th',
  8: '8th',
  9: '9th',
}

/** `-1` is the reader's "no level in frontmatter", not a real level. */
export const spellLevelLabel = (level: number): string =>
  SPELL_LEVEL_LABELS[level] ?? (level < 0 ? '—' : String(level))

export const spellLevelLongLabel = (level: number): string =>
  level === 0 ? 'Cantrip' : level < 0 ? 'Unknown level' : `Level ${level}`

/**
 * Schools arrive **spelled out** in these notes (`school: "Evocation"`), not as
 * the single letters `content_spell` stores and `SpellsPage` decodes. The letter
 * map is kept anyway: `source: VSS` notes are converted homebrew and a few
 * carry the code, and decoding one costs nothing.
 */
const SCHOOL_BY_LETTER: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
  V: 'Evocation',
}

export function schoolLabel(school: string | null): string {
  if (!school) return '—'
  return school.length === 1 ? (SCHOOL_BY_LETTER[school.toUpperCase()] ?? school) : school
}

/** Feat `kind`, as `lib/featBenefitState.js` labels it. */
const FEAT_KIND_LABELS: Record<string, string> = {
  origin: 'Origin feat',
  general: 'General feat',
  epic_boon: 'Epic boon',
  fighting_style: 'Fighting style',
}

const FEAT_KIND_SHORT: Record<string, string> = {
  origin: 'Origin',
  general: 'General',
  epic_boon: 'Epic boon',
  fighting_style: 'Fighting style',
}

export const featKindLabel = (kind: string | null): string | null =>
  kind ? (FEAT_KIND_LABELS[kind] ?? humanise(kind)) : null

export const featKindShortLabel = (kind: string): string =>
  FEAT_KIND_SHORT[kind] ?? humanise(kind)

/**
 * Rarity, in the game's own order rather than alphabetically — a rarity list
 * sorted `Common, Legendary, Rare, Uncommon, Very Rare` is actively misleading,
 * because rarity is a ladder and the chips are read as one.
 */
export const RARITY_ORDER = [
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
  'varies',
] as const

export function rarityRank(rarity: string | null): number {
  if (!rarity) return RARITY_ORDER.length + 1
  const i = RARITY_ORDER.indexOf(rarity.trim().toLowerCase() as (typeof RARITY_ORDER)[number])
  // An unknown rarity sorts after every known one rather than before `common`,
  // so homebrew tiers land at the end instead of at the top of the ladder.
  return i === -1 ? RARITY_ORDER.length : i
}

/**
 * Rarity → one of Obsidian's own accent colours.
 *
 * `the-vault` has hex codes per rarity in `lib/rarityStyles.js`; using them here
 * would be the one place in the plugin that ignores the vault's theme. These are
 * the theme's variables, so a rarity's colour shifts with the rest of the UI —
 * the decision in ADR 0001.
 */
const RARITY_COLOR_VAR: Record<string, string> = {
  common: '--text-muted',
  uncommon: '--color-green',
  rare: '--color-blue',
  'very rare': '--color-purple',
  legendary: '--color-orange',
  artifact: '--color-red',
}

export const rarityColorVar = (rarity: string | null): string =>
  RARITY_COLOR_VAR[(rarity ?? '').trim().toLowerCase()] ?? '--text-faint'

/**
 * Challenge-rating options, matching `MonstersPage`'s ladder: the three
 * fractions, then 1 to 30.
 */
export const CR_VALUES: number[] = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)]

const CR_FRACTIONS: Record<number, string> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }

/**
 * CR for display. `@vault/derive/dnd5e.js` has `formatCR`, but this is four
 * lines, and the fractions have to agree with `CR_VALUES` above either way.
 */
export const crLabel = (cr: number | null): string =>
  cr == null ? '—' : (CR_FRACTIONS[cr] ?? String(cr))

export const ABILITY_LABELS: Array<{ key: string; label: string; short: string }> = [
  { key: 'str', label: 'Strength', short: 'STR' },
  { key: 'dex', label: 'Dexterity', short: 'DEX' },
  { key: 'con', label: 'Constitution', short: 'CON' },
  { key: 'int', label: 'Intelligence', short: 'INT' },
  { key: 'wis', label: 'Wisdom', short: 'WIS' },
  { key: 'cha', label: 'Charisma', short: 'CHA' },
]

/** `epic_boon` → `Epic boon`. For a value with no entry in a label map. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * `1500` copper → `15 gp`. Costs are stored in copper so they stay integers;
 * nobody reads a price that way.
 *
 * Reduces to the largest denomination that divides exactly, which is how the
 * books print a price — `15 gp`, never `15 gp 0 sp 0 cp`. There is no electrum,
 * matching `vault_state.currency`.
 *
 * **Gold is the largest denomination here, and platinum is deliberately not a
 * branch.** There was one, dividing by 100,000 — but a platinum piece is ten
 * gold and therefore 1,000 copper, so that branch was wrong by a factor of a
 * hundred: it turned a 5,000 gp rare into `5 pp`. It was unreachable while the
 * only caller fed it item costs (`cost_cp`, none of them a whole 1,000 gp) and
 * went live the moment MYDND-5 started pricing magic items from their rarity
 * bands, where rare, very rare and legendary are 5,000 / 25,000 / 100,000 gp —
 * 914 of the 1,829 notes.
 *
 * Removed rather than corrected to `/ 1_000`, because `formatCp` in
 * `@vault/derive/currency.js` — which the web app's shop, sell tooltip and value
 * control all render through — decomposes into gp/sp/cp and has no platinum
 * either. The books price magic items in gold, and `500 pp` is a true statement
 * nobody wants to read.
 */
export function copperLabel(cp: number | null): string | null {
  if (cp == null) return null
  if (cp === 0) return '—'
  if (cp % 100 === 0) return `${(cp / 100).toLocaleString()} gp`
  if (cp % 10 === 0) return `${(cp / 10).toLocaleString()} sp`
  return `${cp.toLocaleString()} cp`
}
