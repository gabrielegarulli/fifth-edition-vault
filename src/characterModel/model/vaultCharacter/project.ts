// Projecting a Vault character: its baked choices, through the rules library,
// into the sheet the plugin and the fences show.

import { classResourcePools, deriveCharacterSheet } from '@vault/derive/deriveCharacterSheet.js'
import { isActivated } from '@vault/derive/effects.js'
import { weaponProficiencyLabels } from '@vault/derive/proficiencyLabels.js'
import { deriveSpellcasting } from '@vault/derive/spellcasting.js'
import { toolName } from '@vault/derive/tools.js'

import {
  SHEET_VERSION,
  type Sheet,
  type SheetAbility,
  type SheetFeatureDie,
  type SheetFreeCast,
  type SheetGrantedSpell,
  type SheetHitDie,
  type SheetProficiencies,
  type SheetResource,
  type SheetSave,
  type SheetSkill,
  type SheetSpellcasting,
  type SheetSpellLevel,
} from '../sheet/sheet'
import { pactOnlyRanksFor, slotMapFor, type CasterEntry } from '../spells/slots'
import type { BakeResult } from './bake'
import type { VaultCharacterJson } from './fence'

/**
 * A Vault character's ` ```charsheet ` fence, projected from its choices
 * (MYDND-23).
 *
 * **`@vault/derive`'s vault adapter does the arithmetic** — the same
 * `deriveCharacterSheet` the web sheet renders from, over the same baked
 * effects. This file only maps its output onto the published v1 `Sheet` shape,
 * which is what lets the roster, the sheet page, the vitals overlay and Atlas
 * read a Vault character without knowing it is one.
 *
 * ## What it is handed, and what it is not
 *
 * - **No equipped items.** `projectSheetWithInventory` applies the loadout to
 *   every sheet on read — since MYDND-57 by calling `deriveCharacterSheet` again
 *   with what is worn and the `vault_bake` written here, and *replacing* AC and
 *   the weapon lines with its answer, and since MYDND-108 the `scoreLines` too.
 *   Handing the items over here as well would bake one moment's loadout into a
 *   fence that outlives it.
 * - **No play state in `vault_state`.** Current hit points, temp HP and toggles
 *   are the `vault-vitals` overlay's (ADR 0006); the fence carries the maximum,
 *   with `current` equal to it, which is what that overlay seeds from. The one
 *   thing it does carry is a converted character's `maxBonus` — D&D Beyond's
 *   flat `bonusHitPoints`, which no rule here can derive (MYDND-105).
 *
 * ## Gaps stay blank
 *
 * A field the adapter does not answer is left empty rather than guessed: no
 * attacks (the loadout supplies weapons), no spell list beyond what the json
 * names. A wrong number at the table is worse than a missing one.
 */

const STAT_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

/** `deriveCharacterSheet`'s vault output, as far as this file reads it. */
export interface Derived {
  name: string
  avatarUrl: string | null
  race: string | null
  classes: string
  totalLevel: number
  abilityScores: Array<{ key: string; score: number; mod: number }>
  hp: { max: number }
  ac: number
  initiative: number
  speed: number | null
  pb: number
  saves: Array<{ key: string; proficient: boolean; total: number }>
  skills: Array<{ name: string; ability: string; proficient: boolean; expertise: boolean; total: number }>
  passives: { perception: number; insight: number; investigation: number }
  feats: Array<{ name?: string }>
  spellBonusEffects: Array<Record<string, unknown>>
  sneakAttack: { name: string; notation: string } | null
  grantedSpells?: Array<{ spellName: string; spellId: string | null; mode: string; source: string | null }>
  freeCastSpells?: Array<{
    key: string
    label: string
    spellId: string | null
    spellName: string
    spellLevel: number
    uses: number | null
    resets: string | null
  }> | null
  bonusCantrips?: number
  spellListClasses?: string[]
  senses?: Array<{ sense: string; range: number; source: string | null }>
  speeds?: Record<string, number>
  toolProficiencies?: string[]
  proficiency?: { weapons?: Array<{ category: string; weapon?: object | null }>; armor?: string[] }
}

const upper = (key: string): string => key.toUpperCase()

/**
 * D&D Beyond's `bonusHitPoints` on a converted character, or 0. A flat lump the
 * player entered there; measured on the web app's live rows it is not the
 * Tough feat under another name, so it is carried rather than dropped.
 */
function maxBonusOf(json: VaultCharacterJson): number {
  const n = Number((json as { ddbImport?: { ddbBonusHp?: unknown } }).ddbImport?.ddbBonusHp)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** The `vault_state` every derivation of this character is handed. */
export function vaultStateFor(json: VaultCharacterJson): { hp?: { maxBonus: number } } {
  return maxBonusOf(json) ? { hp: { maxBonus: maxBonusOf(json) } } : {}
}

/** Everything on the sheet that follows from the ability scores. */
export interface ScoreLines {
  abilities: SheetAbility[]
  saves: SheetSave[]
  skills: SheetSkill[]
  passives: Sheet['passives']
  initiative: number
  spellcasting: SheetSpellcasting | null
  /** Never zero: a character with no class or no hit die has no derivable maximum. */
  hpMax: number
}

/**
 * `deriveCharacterSheet`'s scores and what follows from them, in the sheet's
 * spelling. Shared with the loadout overlay (MYDND-108), which derives again
 * with what is worn: a Headband of Intellect changes INT, and with it
 * Investigation, the passive, and a Wizard's spell DC.
 */
export function scoreLines(json: VaultCharacterJson, derived: Derived): ScoreLines {
  const abilities: SheetAbility[] = STAT_ORDER.map(key => {
    const a = derived.abilityScores.find(x => x.key === key)
    return { label: upper(key), score: a?.score ?? 10, mod: a?.mod ?? 0 }
  })

  const saves: SheetSave[] = STAT_ORDER.map(key => {
    const s = derived.saves.find(x => x.key === key)
    return { label: upper(key), proficient: !!s?.proficient, total: s?.total ?? 0 }
  })

  const skills: SheetSkill[] = derived.skills.map(s => ({
    name: s.name,
    ability: upper(s.ability),
    proficient: !!s.proficient,
    expertise: !!s.expertise,
    total: s.total,
  }))

  let spellcasting: SheetSpellcasting | null = null
  const caster = firstCaster(json)
  if (caster) {
    const mod = abilities.find(a => a.label === upper(caster.ability))?.mod ?? 0
    const { spellAttack, saveDc } = deriveSpellcasting({
      abilityMod: mod,
      pb: derived.pb,
      className: caster.className,
      effects: derived.spellBonusEffects,
    }) as { spellAttack: number; saveDc: number }
    spellcasting = { ability: upper(caster.ability), mod, attack: spellAttack, dc: saveDc }
  }

  return {
    abilities,
    saves,
    skills,
    passives: derived.passives,
    initiative: derived.initiative,
    spellcasting,
    // A sheet at 0/0 reads as dead rather than as unfinished.
    hpMax: Math.max(1, derived.hp?.max ?? 0),
  }
}

/** The effect types that grant a defence — `defenseGrants.js`' own set. */
const DEFENSE_TYPES = new Set(['resistance', 'immunity', 'vulnerability', 'condition_immunity'])

/**
 * The baked effects the sheet must still read at render (MYDND-48): anything
 * that switches on and off — Rage, whose resistances and Strength advantage
 * count only while it is on — and anything that grants a defence. A feat's are
 * left out: those are resolved from `feats/` at render already, and carrying
 * them here too would count them twice.
 */
function featureEffects(effects: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  return effects.filter(e => e?.sourceKind !== 'feat' && (isActivated(e) || DEFENSE_TYPES.has(String(e?.type))))
}

const ARMOR_LABEL: Record<string, string> = {
  light: 'Light Armor',
  medium: 'Medium Armor',
  heavy: 'Heavy Armor',
  shield: 'Shields',
}

/** The Defences tab's proficiency lists, in the web sheet's own wording. */
function proficienciesOf(derived: Derived, json: VaultCharacterJson): SheetProficiencies {
  const languages = json.languages ?? []
  return {
    armor: (derived.proficiency?.armor ?? []).map(a => ARMOR_LABEL[a] ?? a),
    weapons: weaponProficiencyLabels(derived.proficiency?.weapons ?? []),
    // A background's tools are no effect, so `derived` cannot have them
    // (MYDND-171). `toolName` is what makes the two read as one proficiency.
    tools: [...new Set([...(derived.toolProficiencies ?? []), ...(json.backgroundTools ?? []).map(t => toolName(t))])].sort(),
    // A character saved before the question was asked stays blank, not guessed.
    languages: languages.length > 0 ? ['Common', ...languages] : [],
  }
}

/**
 * The first class that casts, with its ability resolved.
 *
 * The sheet has room for one spellcasting line, and the web app's Spell Panel
 * shows one per class. The first casting class is the one a single-class
 * character has and the one a multiclass character took first, so it is the
 * least surprising single answer; a multiclass caster's second line is a gap,
 * not a wrong number.
 */
function firstCaster(json: VaultCharacterJson): { ability: string; className: string | null } | null {
  for (const cls of json.classes ?? []) {
    const ability = typeof cls?.spellcastingAbility === 'string' ? cls.spellcastingAbility.toLowerCase() : null
    if (ability && (STAT_ORDER as readonly string[]).includes(ability)) return { ability, className: cls.name ?? null }
  }
  return null
}

/**
 * `json.spells`' `{ cantrips, known }`, grouped by level as the sheet lists them.
 *
 * A known spell's level is the one stored with it since MYDND-36; the builder's
 * picks carry none and are all first level, which is all it offers.
 */
function spellLevels(json: VaultCharacterJson): SheetSpellLevel[] {
  const spells = (json.spells ?? {}) as { cantrips?: unknown[]; known?: unknown[] }
  const byLevel = new Map<number, string[]>()
  const add = (level: number, name: unknown): void => {
    if (typeof name !== 'string' || name.trim() === '') return
    byLevel.set(level, [...(byLevel.get(level) ?? []), name])
  }
  for (const s of spells.cantrips ?? []) add(0, (s as { name?: unknown })?.name)
  for (const s of spells.known ?? []) {
    const level = Number((s as { level?: unknown })?.level)
    add(Number.isInteger(level) && level >= 0 ? level : 1, (s as { name?: unknown })?.name)
  }
  return [...byLevel.entries()].sort(([a], [b]) => a - b).map(([level, names]) => ({ level, spells: names }))
}

/** `vaultGrantedSpells`, in the sheet's spelling. */
function grantedSpells(derived: Derived): SheetGrantedSpell[] {
  return (derived.grantedSpells ?? []).flatMap(g =>
    g.mode === 'prepared' || g.mode === 'cantrip' || g.mode === 'spellbook'
      ? [{ name: g.spellName, id: g.spellId ?? null, mode: g.mode, source: g.source ?? null }]
      : [],
  )
}

/** `vaultFreeCastSpells`, in the sheet's spelling. */
function freeCasts(derived: Derived): SheetFreeCast[] {
  return (derived.freeCastSpells ?? []).map(f => ({
    key: f.key,
    label: f.label,
    name: f.spellName,
    id: f.spellId ?? null,
    level: Number(f.spellLevel) || 0,
    uses: typeof f.uses === 'number' ? f.uses : null,
    resets: f.resets ?? null,
  }))
}

/** One of `classResourcePools`' entries, as far as this file reads it. */
interface DerivedPool {
  key?: string
  name?: string
  uses?: number
  resets?: string
  die?: number
  roll?: { notation?: string } | null
  pool?: boolean
  unit?: string
  shortRestRegain?: number
  detail?: string
}

/**
 * The web sheet's class resources — Rage, Bardic Inspiration, Channel
 * Divinity, the feat pools — through `classResourcePools`, the same list its
 * `ClassResourcesPanel` and `shortRestPlan` read (MYDND-47). Nothing about a
 * pool's size is decided here.
 */
function classResources(derived: Derived): SheetResource[] {
  const pools = (classResourcePools(derived) as (DerivedPool | null | undefined)[]).filter(
    (p): p is DerivedPool => !!p && typeof p.key === 'string' && typeof p.uses === 'number' && p.uses > 0,
  )
  return pools.map(p => ({
    key: p.key as string,
    name: p.name ?? (p.key as string),
    uses: p.uses as number,
    resets: p.resets === 'short_rest' || p.resets === 'long_rest' ? p.resets : null,
    roll: p.roll?.notation ?? (typeof p.die === 'number' ? `1d${p.die}` : null),
    ...(p.pool ? { points: true } : {}),
    ...(p.unit ? { unit: p.unit } : {}),
    ...(p.shortRestRegain ? { short_rest_regain: p.shortRestRegain } : {}),
    ...(p.detail ? { detail: p.detail } : {}),
  }))
}

/**
 * @param casters Each class's slot progression, read from its class note by
 *   `buildVaultSheet`. Omitted, the sheet states no slots at all — which the
 *   panel reads as "rebuild me", never as "this character has none".
 */
export function projectVaultSheet(
  json: VaultCharacterJson,
  baked: Pick<BakeResult, 'effects' | 'proficiencyBaseline'>,
  ddbId: string,
  casters?: readonly CasterEntry[],
): Sheet {
  const derived = deriveCharacterSheet(
    {
      source: 'vault',
      json: { ...json, resolvedEffects: baked.effects, proficiencyBaseline: baked.proficiencyBaseline },
      vault_state: vaultStateFor(json),
    },
    [],
    {},
  ) as Derived

  const { abilities, saves, skills, passives, initiative, spellcasting, hpMax } = scoreLines(json, derived)

  const hit_dice: SheetHitDie[] = (json.classes ?? [])
    .filter(c => c?.name && typeof c.hit_die === 'number' && c.level > 0)
    .map(c => ({ label: String(c.name), formula: `${c.level}d${c.hit_die}` }))

  const feature_dice: SheetFeatureDie[] = derived.sneakAttack
    ? [{ name: derived.sneakAttack.name, formula: derived.sneakAttack.notation, activation: null }]
    : []

  const subclasses = (json.classes ?? [])
    .map(c => c?.subclass?.name)
    .filter((n): n is string => typeof n === 'string' && n !== '')

  const feats = derived.feats.map(f => f?.name).filter((n): n is string => typeof n === 'string' && n !== '')

  const granted = grantedSpells(derived)
  const free = freeCasts(derived)
  const listClasses = derived.spellListClasses ?? []
  const class_resources = classResources(derived)

  return {
    version: SHEET_VERSION,
    name: derived.name,
    ddb_id: ddbId,
    race: derived.race,
    classes: derived.classes || '—',
    level: derived.totalLevel,
    proficiency_bonus: derived.pb,
    ac: derived.ac,
    hp: { current: hpMax, max: hpMax, temp: 0 },
    speed: derived.speed,
    initiative,
    hit_dice,
    abilities,
    saves,
    skills,
    passives,
    spellcasting,
    attacks: [],
    feature_dice,
    spells: spellLevels(json),
    avatar: derived.avatarUrl,
    // A portrait saved into the vault, by a conversion from D&D Beyond
    // (MYDND-105). Carried in the choices because the sheet is re-projected on
    // every save, and the roster draws it without the network.
    ...(typeof json.portrait === 'string' && json.portrait ? { portrait: json.portrait } : {}),
    subclasses,
    ...(feats.length > 0 ? { feats } : {}),
    // Written even when empty — `{}` is "no slots", absent is "projected before
    // MYDND-36". See `Sheet.spell_slots`.
    ...(casters ? { spell_slots: slotMapFor(casters), short_rest_slot_ranks: pactOnlyRanksFor(casters) } : {}),
    ...(granted.length > 0 ? { granted_spells: granted } : {}),
    ...(free.length > 0 ? { free_cast_spells: free } : {}),
    // Written even when empty, like `spell_slots`: `[]` is "none", absent is
    // "projected before MYDND-47".
    class_resources,
    // MYDND-48. Written even when empty, for the same reason.
    feature_effects: featureEffects(baked.effects),
    // MYDND-57. The whole bake, so the loadout overlay can re-derive AC and the
    // weapon lines with what is worn. See `Sheet.vault_bake`.
    vault_bake: {
      effects: baked.effects,
      proficiency_baseline: baked.proficiencyBaseline ?? null,
    },
    senses: (derived.senses ?? []).map(s => ({ name: s.sense, range: s.range, source: s.source ?? null })),
    speeds: { ...(derived.speeds ?? {}) },
    proficiencies: proficienciesOf(derived, json),
    ...(derived.bonusCantrips ? { bonus_cantrips: derived.bonusCantrips } : {}),
    ...(listClasses.length > 0 ? { spell_list_classes: listClasses } : {}),
  }
}
