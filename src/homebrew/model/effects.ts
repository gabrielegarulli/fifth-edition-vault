import { VAULT_SKILLS } from '@vault/derive/vaultDerive.js'

/**
 * The effects a builder offers (MYDND-233): the ten `docs/homebrew/effects.md`
 * teaches for a feat, and the five a worn magic item can carry. Everything
 * else is "copy a block from an exported note", as the tutorial says.
 *
 * A form holds every field as a string, as the inputs do; `effectToFence`
 * turns one into the stored shape and `effectFormProblems` says, in a
 * sentence, why it cannot be stored yet. A half-filled effect that is *saved*
 * looks exactly like something somebody meant, so the builder refuses it.
 */

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type Ability = (typeof ABILITIES)[number]

export const ABILITY_NAMES: Readonly<Record<Ability, string>> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

export const SKILLS: ReadonlyArray<{ slug: string; name: string }> = VAULT_SKILLS.map(s => ({ slug: s.slug, name: s.name }))

/** Lower case, as `resistance`'s `value` and an item's `damage_type` filter want. */
export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const

export const SENSES = ['darkvision', 'blindsight', 'tremorsense', 'truesight'] as const
export const SPEED_MODES = ['walk', 'fly', 'swim', 'climb', 'burrow'] as const
export const WEAPON_CATEGORIES = ['simple', 'martial'] as const
export const ARMOR_CATEGORIES = ['light', 'medium', 'heavy', 'shield'] as const
export const RESETS = ['short_rest', 'long_rest'] as const

export type EffectType =
  | 'ability_score_bonus'
  | 'ability_score_choice'
  | 'skill_proficiency'
  | 'saving_throw_proficiency'
  | 'weapon_proficiency'
  | 'armor_training'
  | 'resistance'
  | 'sense'
  | 'speed'
  | 'feature_resource'
  | 'ac_bonus'
  | 'spell_attack_bonus'
  | 'spell_save_dc_bonus'

/** How each type reads on its chip and in the type picker. */
export const EFFECT_LABEL: Readonly<Record<EffectType, string>> = {
  ability_score_bonus: 'Raise one score',
  ability_score_choice: 'Raise one score of choice',
  skill_proficiency: 'Skill proficiency',
  saving_throw_proficiency: 'Saving throw proficiency',
  weapon_proficiency: 'Weapon proficiency',
  armor_training: 'Armor training',
  resistance: 'Resistance',
  sense: 'Sense',
  speed: 'Speed',
  feature_resource: 'Uses',
  ac_bonus: 'Armor Class bonus',
  spell_attack_bonus: 'Spell attack bonus',
  spell_save_dc_bonus: 'Spell save DC bonus',
}

/** A feat's benefit takes these, as a species' trait would. */
export const FEAT_EFFECT_TYPES: readonly EffectType[] = [
  'ability_score_choice',
  'ability_score_bonus',
  'skill_proficiency',
  'saving_throw_proficiency',
  'weapon_proficiency',
  'armor_training',
  'resistance',
  'sense',
  'speed',
  'feature_resource',
]

/**
 * A worn magic item's: three of `ITEM_EFFECT_TYPES` (derive's `itemData.js`),
 * and the resistance and speed the sheet has counted while an item is worn
 * since MYDND-239.
 */
export const MAGIC_ITEM_EFFECT_TYPES: readonly EffectType[] = [
  'ac_bonus',
  'spell_attack_bonus',
  'spell_save_dc_bonus',
  'resistance',
  'speed',
]

/** One effect as the form holds it. Unused fields stay as they were, so switching type back loses nothing. */
export interface EffectForm {
  type: EffectType
  ability: Ability
  /** `ability_score_choice`'s options. */
  options: Ability[]
  amount: string
  max: string
  skill: string
  category: string
  damageType: string
  sense: string
  range: string
  mode: string
  /** `speed`: add to the speed rather than set it. */
  add: boolean
  name: string
  uses: string
  /** `feature_resource`: as many uses as the Proficiency Bonus. */
  usesProficiency: boolean
  resets: string
}

export function emptyEffect(type: EffectType): EffectForm {
  return {
    type,
    ability: 'str',
    options: [],
    amount: type === 'speed' ? '30' : '1',
    max: '20',
    skill: 'athletics',
    category: type === 'armor_training' ? 'light' : 'simple',
    damageType: 'fire',
    sense: 'darkvision',
    range: '60',
    mode: 'walk',
    add: false,
    name: '',
    uses: '1',
    usesProficiency: false,
    resets: 'long_rest',
  }
}

const whole = (text: string): number | null => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null)

/** What stops this effect being stored, a sentence each. Empty means it can be. */
export function effectFormProblems(e: EffectForm): string[] {
  const out: string[] = []
  const amount = whole(e.amount)
  switch (e.type) {
    case 'ability_score_bonus':
    case 'ability_score_choice': {
      if (e.type === 'ability_score_choice' && e.options.length < 2) out.push('Pick at least two scores to choose from.')
      if (amount === null || amount <= 0) out.push('The increase must be a whole number above 0.')
      const max = whole(e.max)
      if (max === null || max < 1 || max > 30) out.push('The maximum must be a whole number from 1 to 30.')
      break
    }
    case 'sense': {
      const range = whole(e.range)
      if (range === null || range <= 0) out.push('The range must be a whole number of feet above 0.')
      break
    }
    case 'speed':
      if (amount === null || amount <= 0) out.push('The speed must be a whole number of feet above 0.')
      break
    case 'feature_resource': {
      if (e.name.trim() === '') out.push('Name the uses, as the sheet will label them.')
      const uses = whole(e.uses)
      if (!e.usesProficiency && (uses === null || uses <= 0)) out.push('Uses must be a whole number above 0.')
      break
    }
    case 'ac_bonus':
    case 'spell_attack_bonus':
    case 'spell_save_dc_bonus':
      if (amount === null || amount === 0) out.push('The bonus must be a whole number, not 0.')
      break
    default:
      break
  }
  return out
}

/** `Hearth's Rest` → `hearths_rest`, as a resource key wants it. */
export const keyPart = (text: string): string =>
  text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/**
 * The stored effect. `resourceKey` is the note's and the benefit's name, which
 * is unique across a character as `docs/homebrew/effects.md` asks:
 * `vaultFeatureResources` drops a resource with no key.
 */
export function effectToFence(e: EffectForm, resourceKey: string): Record<string, unknown> {
  const n = (text: string) => whole(text) ?? 0
  switch (e.type) {
    case 'ability_score_bonus':
      return { type: e.type, ability: e.ability, amount: n(e.amount), max: n(e.max) }
    case 'ability_score_choice':
      return { type: e.type, amount: n(e.amount), max: n(e.max), options: ABILITIES.filter(a => e.options.includes(a)) }
    case 'skill_proficiency':
      return { type: e.type, skill: e.skill }
    case 'saving_throw_proficiency':
      return { type: e.type, ability: e.ability }
    case 'weapon_proficiency':
    case 'armor_training':
      return { type: e.type, category: e.category }
    case 'resistance':
      return { type: e.type, value: e.damageType }
    case 'sense':
      return { type: e.type, sense: e.sense, range: n(e.range) }
    case 'speed':
      return {
        type: e.type,
        ...(e.mode !== 'walk' ? { mode: e.mode } : {}),
        amount: n(e.amount),
        ...(e.add ? { add: true } : {}),
      }
    case 'feature_resource':
      return {
        type: e.type,
        key: resourceKey,
        name: e.name.trim(),
        uses: e.usesProficiency ? { kind: 'proficiency_bonus' } : n(e.uses),
        resets: e.resets,
      }
    case 'ac_bonus':
    case 'spell_attack_bonus':
    case 'spell_save_dc_bonus':
      return { type: e.type, amount: n(e.amount) }
  }
}

const labelOf = (list: ReadonlyArray<{ slug: string; name: string }>, slug: string) => list.find(s => s.slug === slug)?.name ?? slug
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const signed = (s: string) => (whole(s) ?? 0) >= 0 ? `+${whole(s) ?? 0}` : String(whole(s))

/** The effect in a few words, for its collapsed row: "Resistance · Fire". */
export function effectSummary(e: EffectForm): string {
  switch (e.type) {
    case 'ability_score_bonus':
      return `${ABILITY_NAMES[e.ability]} +${e.amount}, to ${e.max}`
    case 'ability_score_choice':
      return `${e.options.map(a => a.toUpperCase()).join(' or ') || 'no scores yet'} +${e.amount}, to ${e.max}`
    case 'skill_proficiency':
      return labelOf(SKILLS, e.skill)
    case 'saving_throw_proficiency':
      return `${ABILITY_NAMES[e.ability]} saves`
    case 'weapon_proficiency':
      return `${cap(e.category)} weapons`
    case 'armor_training':
      return e.category === 'shield' ? 'Shields' : `${cap(e.category)} armor`
    case 'resistance':
      return cap(e.damageType)
    case 'sense':
      return `${cap(e.sense)} ${e.range} ft.`
    case 'speed':
      return `${e.mode === 'walk' ? 'Walking' : cap(e.mode)} ${e.add ? '+' : ''}${e.amount} ft.`
    case 'feature_resource':
      return `${e.name || 'Unnamed'}: ${e.usesProficiency ? 'Proficiency Bonus' : e.uses} per ${e.resets === 'short_rest' ? 'Short' : 'Long'} Rest`
    case 'ac_bonus':
    case 'spell_attack_bonus':
    case 'spell_save_dc_bonus':
      return signed(e.amount)
  }
}
