import { VAULT_SKILLS } from '@vault/derive/vaultDerive.js'

import { toVaultJson, blankDraft, raceData, type BuilderDraft, type ClassSource } from './draft'
import type {
  ClassRow,
  SubclassFence,
  SubclassRow,
  FeatRow,
  ItemRow,
  MagicItemRow,
  BackgroundRow,
  LineageFence,
  SpeciesRow,
  SpellRow,
} from '../../compendium'
import type {
  InventoryCurrency,
  InventoryItem,
  VaultCharacterJson,
  DdbPayload,
  Sheet,
} from '../../characterModel'
import { buildSheet } from '../../characterModel'

/**
 * A D&D Beyond payload, turned into a Vault character (MYDND-105).
 *
 * The plugin's port of `the-vault`'s `apps/vault/src/lib/ddbToVault.js`
 * (VAULT-46). Vault characters are canonical and the import is the bridge; this
 * is the crossing. Pure, like the original: catalog rows come in as arguments
 * and nothing here reads a note, so the review page can re-run it after every
 * pick the GM corrects.
 *
 * **Nothing here decides anything on its own.** Every catalog match is a
 * *proposal* carried next to the D&D Beyond name it came from, and the review
 * page shows all of them before a byte is written. The web app's measurement is
 * the reason: 7 of 21 live characters resolved fully. This vault's, 2026-10-22:
 * 29 of the 42 in the Disposable Heroes campaign.
 *
 * ## Where it differs from the web app, on purpose
 *
 * - **Numbers come from `buildSheet`**, the plugin's own D&D Beyond reader, not
 *   from `ddbDerive`'s. It is what the imported sheet already showed, and it
 *   filters item modifiers to what is worn and attuned (MYDND-53); the web
 *   reader does not.
 * - **Ability scores are the finals without the items' modifiers.** The items
 *   move into the vault's inventory, where the loadout applies them again on
 *   read. The finals *with* items are kept for the review to show the difference.
 *   A Manual's or Tome's bonus is the exception: it is permanent, so it stays.
 * - **Aliases match too.** The exporter writes a note's other spellings as
 *   `aliases`, and five of this vault's D&D Beyond subclasses are spelled only
 *   that way (`Circle of the Stars` → `Circle of Stars`).
 * - **The json goes through the builder's own `toVaultJson`**, not
 *   `finalVaultJson` direct, so a converted character has exactly the keys a
 *   built one does. The skills that do not fit the class's pick are kept as a
 *   `featureChoices` array, which `finalVaultJson` folds back in on every save
 *   — `finalVaultJson` alone cuts them to the class's count.
 * - **The payload is not parked in the json.** The web app keeps it on the row
 *   so its Items tab can read it; here the items move into ` ```vault-inventory `
 *   and the note would only carry a large copy of what is already in it.
 */

// --- Matching -----------------------------------------------------------------

export type MatchHow = 'exact' | 'suffix' | 'alias'

export interface Match<R> {
  ddbName: string | null
  chosen: R | null
  how: MatchHow | null
}

interface Nameable {
  name: string
  aliases?: string[]
}

const matchKey = (name: unknown): string =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

// D&D Beyond appends the book to a name it holds more than one printing of —
// `Phantom (TCoE)`, `Magic Initiate (Wizard)`. Trimming it is a second, weaker
// attempt, and the match says which attempt worked so the review can mark a
// suffix match as the guess it is: `Twilight Domain (TCoE)` lands on the 5.5e note.
const trimmedKey = (name: unknown): string => matchKey(String(name ?? '').replace(/\s*\([^)]*\)\s*$/, ''))

/** Exact name, then the name with its `(Book)` trimmed, then any alias under either. */
export function matchByName<R extends Nameable>(ddbName: string | null | undefined, rows: readonly R[]): Match<R> {
  const base: Match<R> = { ddbName: ddbName ?? null, chosen: null, how: null }
  if (!ddbName) return base
  const wanted = matchKey(ddbName)
  const trimmed = trimmedKey(ddbName)

  const exact = rows.find(r => matchKey(r.name) === wanted)
  if (exact) return { ...base, chosen: exact, how: 'exact' }
  // A trim that changes nothing is not a second attempt, and would report an
  // exact miss as a suffix match.
  const suffix = trimmed !== wanted ? rows.find(r => matchKey(r.name) === trimmed) : undefined
  if (suffix) return { ...base, chosen: suffix, how: 'suffix' }
  const alias = rows.find(r => (r.aliases ?? []).some(a => matchKey(a) === wanted || matchKey(a) === trimmed))
  return alias ? { ...base, chosen: alias, how: 'alias' } : base
}

// D&D Beyond's `feats` array is not a list of feats: the web app measured 27
// `Weapon Mastery` class-feature entries (four spellings) and 20 background
// ability bonuses recorded as pseudo-feats in 165. Dropped rather than reported
// as holes, because "no feat called Weapon Mastery" is noise, not a question.
const NOT_A_FEAT = [/weapon mastery/i, /ability score improvements?$/i]
const isNotAFeat = (name: string): boolean => NOT_A_FEAT.some(re => re.test(name))

// --- The plan -----------------------------------------------------------------

export interface ConversionCatalog {
  classes: readonly ClassRow[]
  subclasses: readonly SubclassRow[]
  species: readonly SpeciesRow[]
  backgrounds: readonly BackgroundRow[]
  feats: readonly FeatRow[]
  spells: readonly SpellRow[]
  items: readonly ItemRow[]
  magicItems: readonly MagicItemRow[]
}

export interface ClassPlan extends Match<ClassRow> {
  level: number
  /** Searched only among the matched class's subclasses; `null` when D&D Beyond names none. */
  subclass: Match<SubclassRow> | null
}

export interface ItemPlan {
  ddbName: string
  quantity: number
  equipped: boolean
  attuned: boolean
  magic: boolean
  /** The catalog note it becomes, or neither — then it is a row with just a name. */
  item: ItemRow | null
  magicItem: MagicItemRow | null
}

export interface ConversionPlan {
  ddbId: string
  name: string
  avatarUrl: string | null
  race: Match<SpeciesRow>
  classes: ClassPlan[]
  background: Match<BackgroundRow> | null
  /** D&D Beyond's finals, less what worn items add — see the module comment. */
  abilityScores: Record<AbilityKey, number>
  /** Abilities a worn item raises on D&D Beyond: `[ability, with, without]`. */
  itemRaisedScores: Array<{ ability: AbilityKey; withItems: number; without: number }>
  saveProficiencies: AbilityKey[]
  /** Vault skill slugs (`sleight_of_hand`). */
  skillProficiencies: string[]
  skillExpertise: string[]
  feats: Match<FeatRow>[]
  ignoredFeats: string[]
  spells: Array<Match<SpellRow> & { ddbLevel: number }>
  items: ItemPlan[]
  currency: InventoryCurrency
  /** The sheet as imported, for the review's before/after and the vitals seed. */
  ddbSheet: Sheet
  ddbBonusHp: number
  xp: number | null
}

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
type AbilityKey = (typeof ABILITIES)[number]

const skillSlugByName = new Map(
  (VAULT_SKILLS as Array<{ name: string; slug: string }>).map(s => [s.name.toLowerCase(), s.slug]),
)

/**
 * A book whose reading raises a score for good: Manual of Bodily Health, Tome of
 * Clear Thought and the rest. D&D Beyond keeps it in the inventory, equipped,
 * with the increase as an item modifier.
 */
const PERMANENT_BOOST = /^(manual|tome) of /i

/**
 * The payload with the item modifiers removed — the scores a character has on
 * its own, which the loadout adds a worn item to again.
 *
 * **Except a Manual's or a Tome's score bonus** (MYDND-112). Its increase is
 * permanent, and no loadout re-applies a book once it is read: stripped, Shade's
 * Manual of Bodily Health cost him 2 CON and 15 hit points for good. It stays in
 * the score, and the book comes across as a carried item like any other.
 */
function withoutItemModifiers(payload: DdbPayload): DdbPayload {
  const mods = payload?.modifiers
  if (!mods || typeof mods !== 'object') return payload
  const books = new Set(
    (payload?.inventory ?? [])
      .filter(i => PERMANENT_BOOST.test(i?.definition?.name ?? ''))
      .map(i => i?.definition?.id)
      .filter((id): id is number => typeof id === 'number'),
  )
  const kept = (mods.item ?? []).filter(
    m => !!m && typeof m.componentId === 'number' && books.has(m.componentId) && /-score$/.test(m.subType ?? ''),
  )
  return { ...payload, modifiers: { ...mods, item: kept } }
}

function scoresOf(sheet: Sheet): Record<AbilityKey, number> {
  const out = {} as Record<AbilityKey, number>
  for (const key of ABILITIES) out[key] = sheet.abilities.find(a => a.label === key.toUpperCase())?.score ?? 10
  return out
}

// Electrum is the one coin the Vault has none of, so it comes across as the
// silver it is worth. The alternative was dropping it.
function currencyOf(sheet: Sheet): InventoryCurrency {
  const c = sheet.ddb_currency
  const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0)
  return { pp: n(c?.pp), gp: n(c?.gp), sp: n(c?.sp) + 5 * n(c?.ep), cp: n(c?.cp) }
}

/**
 * Proposes a conversion. Nothing is written: the review page shows this, lets
 * the GM correct any pick, and then calls `planToVaultJson`.
 */
export function buildConversionPlan(payload: DdbPayload, ddbId: string, catalog: ConversionCatalog): ConversionPlan {
  const sheet = buildSheet(payload, ddbId)
  const own = buildSheet(withoutItemModifiers(payload), ddbId)
  const withItems = scoresOf(sheet)
  const abilityScores = scoresOf(own)

  // `baseName` rather than `fullName`, which carries the lineage ("Mark of
  // Passage Human"); the catalog holds the species.
  const race = matchByName(payload?.race?.baseName || payload?.race?.fullName || null, catalog.species)

  const classes: ClassPlan[] = (payload?.classes ?? [])
    .filter((c): c is NonNullable<typeof c> => !!c && (c.level ?? 0) > 0)
    .map(c => {
      const matched = matchByName(c.definition?.name ?? null, catalog.classes)
      const subclassName = c.subclassDefinition?.name ?? null
      // Only the matched class's subclasses, so one Cleric domain is never
      // matched against another class's archetype of the same name.
      const options = matched.chosen
        ? catalog.subclasses.filter(s => matchKey(s.className) === matchKey(matched.chosen!.name))
        : []
      return {
        ...matched,
        level: c.level ?? 1,
        subclass: subclassName ? matchByName(subclassName, options) : null,
      }
    })

  const backgroundName = payload?.background?.definition?.name ?? null

  const featNames = (sheet.feats ?? []).filter(Boolean)
  const spellMatches = (sheet.spells ?? []).flatMap(group =>
    group.spells.map(name => ({ ...matchByName(name, catalog.spells), ddbLevel: group.level })),
  )

  const items: ItemPlan[] = (sheet.ddb_items ?? []).map(i => {
    const magicItem = i.magic ? matchByName(i.name, catalog.magicItems).chosen : null
    const item = magicItem ? null : matchByName(i.name, catalog.items).chosen
    return {
      ddbName: i.name,
      quantity: Math.max(1, Math.floor(i.quantity || 1)),
      equipped: i.equipped,
      attuned: i.attuned,
      magic: i.magic,
      item,
      magicItem,
    }
  })

  const xp = Number(payload?.currentXp)

  return {
    ddbId,
    name: sheet.name,
    avatarUrl: (payload?.decorations?.avatarUrl as string | null | undefined) ?? null,
    race,
    classes,
    background: backgroundName ? matchByName(backgroundName, catalog.backgrounds) : null,
    abilityScores,
    itemRaisedScores: ABILITIES.filter(k => withItems[k] !== abilityScores[k]).map(k => ({
      ability: k,
      withItems: withItems[k],
      without: abilityScores[k],
    })),
    saveProficiencies: sheet.saves.filter(s => s.proficient).map(s => s.label.toLowerCase() as AbilityKey),
    skillProficiencies: sheet.skills
      .filter(s => s.proficient)
      .map(s => skillSlugByName.get(s.name.toLowerCase()))
      .filter((s): s is string => !!s),
    skillExpertise: sheet.skills
      .filter(s => s.expertise)
      .map(s => skillSlugByName.get(s.name.toLowerCase()))
      .filter((s): s is string => !!s),
    feats: featNames.filter(n => !isNotAFeat(n)).map(n => matchByName(n, catalog.feats)),
    ignoredFeats: featNames.filter(isNotAFeat),
    spells: spellMatches,
    items,
    currency: currencyOf(sheet),
    ddbSheet: sheet,
    ddbBonusHp: Math.max(0, Math.floor(Number(payload?.bonusHitPoints) || 0)),
    xp: Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : null,
  }
}

// --- Holes --------------------------------------------------------------------

export type HoleKind = 'species' | 'class' | 'subclass' | 'background' | 'feat' | 'spell'

export interface Hole {
  kind: HoleKind
  name: string
  /** A character with no class or no species cannot be derived at all. */
  blocking: boolean
}

/**
 * Everything the plan could not resolve. A class or species hole blocks the
 * conversion — `vaultHp` needs a hit die and `vaultSpeed` a species speed. The
 * rest converts with a gap the builder can fill afterwards.
 */
export function planHoles(plan: ConversionPlan): Hole[] {
  const holes: Hole[] = []
  if (!plan.race.chosen) holes.push({ kind: 'species', name: plan.race.ddbName ?? '(none)', blocking: true })
  for (const c of plan.classes) {
    if (!c.chosen) holes.push({ kind: 'class', name: c.ddbName ?? '(none)', blocking: true })
    if (c.subclass?.ddbName && !c.subclass.chosen) {
      holes.push({ kind: 'subclass', name: c.subclass.ddbName, blocking: false })
    }
  }
  if (plan.background?.ddbName && !plan.background.chosen) {
    holes.push({ kind: 'background', name: plan.background.ddbName, blocking: false })
  }
  for (const f of plan.feats) if (!f.chosen) holes.push({ kind: 'feat', name: f.ddbName ?? '', blocking: false })
  for (const s of plan.spells) if (!s.chosen) holes.push({ kind: 'spell', name: s.ddbName ?? '', blocking: false })
  return holes
}

export function planIsConvertible(plan: ConversionPlan): boolean {
  return plan.classes.length > 0 && !planHoles(plan).some(h => h.blocking)
}

// --- The json -----------------------------------------------------------------

/** The `featureChoices` key holding the skills that are not the class's pick. */
export const DDB_SKILLS_KEY = 'ddb:skills'

/** What the review page has loaded for the plan's picks: each class's fence, the species' fence. */
export interface PlanSources {
  /** One per `plan.classes` entry with a match, in order. */
  classSources: ReadonlyArray<ClassSource | null>
  /** Each class's matched subclass fence, in the same order; an Eldritch Knight's ability is on it (MYDND-182). */
  subclassFences?: ReadonlyArray<SubclassFence | null>
  speciesFence: LineageFence | null
}

const asRef = <R extends { id: string; name: string; source: string | null }>(row: R | null) =>
  row ? { id: row.id, name: row.name, source: row.source ?? null } : null

const slugKey = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[\s-]+/g, '_')

/**
 * The record a conversion leaves in the json. `finalizedBonusSources` is
 * stamped by the caller after the first bake — see `./finals.ts`.
 */
export interface DdbImportRecord {
  ddbId: string
  convertedAt: string
  /** D&D Beyond's hit points, kept because the Vault re-derives the maximum. */
  ddbHp: { current: number; max: number }
  ddbBonusHp: number
  unmatched: Array<{ kind: HoleKind; name: string }>
  ignoredFeats: string[]
  finalizedBonusSources?: Array<string | null>
}

/**
 * The converted character's choices.
 *
 * Built as a builder draft and handed to `toVaultJson`, so the json has exactly
 * the keys the builder writes and re-opens. D&D Beyond's scores are **finals**:
 * `abilityMethod: 'manual'` with no background bonuses, and `ddbImport` is what
 * tells every later bake so (`scoresAreFinal`).
 */
export function planToVaultJson(plan: ConversionPlan, sources: PlanSources, now: Date = new Date()): VaultCharacterJson {
  const featureChoices: Record<string, unknown> = {}

  // A feat is a `featureChoices` entry too, under the key a feat added from the
  // sheet uses (MYDND-58): `finalVaultJson` rebuilds `feats` from those entries,
  // so a feat listed only in `feats` would vanish at the next builder save.
  for (const f of plan.feats) {
    if (!f.chosen) continue
    featureChoices[`feat_${f.chosen.id}`] = {
      type: 'feat',
      featId: f.chosen.id,
      featName: f.chosen.name,
      featSource: f.chosen.source ?? null,
    }
  }
  if (plan.skillExpertise.length > 0) {
    featureChoices['ddb:expertise'] = { type: 'expertise', skills: [...plan.skillExpertise] }
  }

  // The class's own pick is the D&D Beyond skills it offers, up to its count;
  // the rest — species, background, feats — go in a bare array, which
  // `finalVaultJson` folds into `skillProficiencies` on this save and every
  // later one. Left in `skillProficiencies`, they are cut to the class's count.
  const firstFence = sources.classSources[0]?.fence ?? null
  const choice = firstFence?.data?.skillChoices as { count?: unknown; options?: unknown } | undefined
  const count = Number(choice?.count)
  const offered = new Set((Array.isArray(choice?.options) ? choice.options : []).map(slugKey))
  const classPicks =
    Number.isFinite(count) && count > 0
      ? plan.skillProficiencies.filter(s => offered.has(slugKey(s))).slice(0, count)
      : []
  const rest = plan.skillProficiencies.filter(s => !classPicks.includes(s))
  if (rest.length > 0) featureChoices[DDB_SKILLS_KEY] = rest

  const matched = plan.classes.filter(c => c.chosen)
  const draft: BuilderDraft = {
    ...blankDraft(),
    name: plan.name,
    avatarUrl: plan.avatarUrl ?? '',
    race: plan.race.chosen
      ? {
          ...asRef(plan.race.chosen)!,
          subrace: null,
          size: null,
          spellcastingAbility: null,
          cantrip: null,
        }
      : null,
    classes: matched.map(c => ({
      ...asRef(c.chosen)!,
      level: c.level,
      subclass: c.subclass?.chosen ? { id: c.subclass.chosen.id, name: c.subclass.chosen.name } : null,
      spellcastingAbility: null,
    })),
    background: asRef(plan.background?.chosen ?? null),
    abilityMethod: 'manual',
    abilityScores: { ...plan.abilityScores },
    backgroundBonuses: { primary: null, secondary: null },
    saveProficiencies: [...plan.saveProficiencies],
    skillProficiencies: classPicks,
    featureChoices,
    spells: {
      cantrips: plan.spells.filter(s => s.chosen && s.chosen.level === 0).map(s => asRef(s.chosen)!),
      known: plan.spells.filter(s => s.chosen && s.chosen.level > 0).map(s => asRef(s.chosen)!),
    },
    // Granted already: what the character carries comes across from D&D
    // Beyond, and the builder must never hand it a starting kit on top.
    equipment: { option: null, choices: {}, granted: true },
  }

  const json = toVaultJson(draft, {
    classSources: sources.classSources,
    subclassFences: sources.subclassFences,
    race: plan.race.chosen ? raceData(plan.race.chosen, sources.speciesFence) : null,
    background: plan.background?.chosen ?? null,
  })

  const ddbImport: DdbImportRecord = {
    ddbId: plan.ddbId,
    convertedAt: now.toISOString(),
    ddbHp: { current: plan.ddbSheet.hp.current, max: plan.ddbSheet.hp.max },
    ddbBonusHp: plan.ddbBonusHp,
    unmatched: planHoles(plan).map(({ kind, name }) => ({ kind, name })),
    ignoredFeats: [...plan.ignoredFeats],
  }
  // Spell levels ride on the stored pick (MYDND-36): the projection reads no
  // catalog, and without it every spell is filed under level 1.
  const withLevels = (list: unknown): unknown =>
    Array.isArray(list)
      ? list.map(s => {
          const row = plan.spells.find(p => p.chosen?.id === (s as { id?: string })?.id)?.chosen
          return row ? { ...(s as object), level: row.level } : s
        })
      : list
  const spells = json.spells as { cantrips?: unknown; known?: unknown } | undefined
  return {
    ...json,
    spells: { ...spells, cantrips: withLevels(spells?.cantrips), known: withLevels(spells?.known) },
    ddbImport,
  }
}

// --- What else comes across ---------------------------------------------------

/**
 * D&D Beyond's items as inventory rows: a catalog note where one matched, a
 * name where none did.
 *
 * **Carried, never worn.** Equipping here goes through the loadout's slot,
 * two-hander and bearing checks (`equipBlockedReason`), and attunement through
 * its limit; a conversion that set `equipped` itself would put a character in
 * a loadout those checks would refuse. The review lists what was worn on D&D
 * Beyond, so the player equips it from the inventory.
 */
export function planInventoryRows(plan: ConversionPlan, newId: () => string): InventoryItem[] {
  return plan.items.map(i => ({
    id: newId(),
    quantity: i.quantity,
    ...(i.magicItem ? { magic_item_id: i.magicItem.id } : i.item ? { content_item_id: i.item.id } : { name: i.ddbName }),
    equipped: false,
    attuned: false,
  }))
}
