import type { FeatKind } from '../../compendium'
import type { BuilderKind } from './kinds'
import type { EffectForm } from './effects'

/**
 * What each builder's form holds (MYDND-233). Every field is what an input
 * holds, a string or a boolean; `emit.ts` turns a form into the note, in the
 * shape of `src/compendium/templates/<kind>.full.md`, and the reader decides
 * whether it worked (`check.ts`).
 */

interface Common {
  name: string
  source: string
  /** The note's prose, Markdown, as the catalog shows it. */
  description: string
}

export interface SpellForm extends Common {
  kind: 'spell'
  /** `0` is a cantrip. */
  level: string
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  classes: string[]
  damageDice: string
  damageType: string
  upcastDice: string
  upcastEvery: string
}

export interface ConditionForm extends Common {
  kind: 'condition'
}

export interface ItemForm extends Common {
  kind: 'item'
  itemType: string
  /** In gold pieces, as a price is read; written as `cost_cp`. */
  costGp: string
  weight: string
  weaponCategory: string
  damage: string
  damageType: string
  versatileDamage: string
  range: string
  properties: string[]
  mastery: string
  ac: string
  strength: string
  stealthDisadvantage: boolean
}

export interface MagicItemForm extends Common {
  kind: 'magic-item'
  itemType: string
  rarity: string
  requiresAttunement: boolean
  attunementRestriction: string
  cursed: boolean
  weight: string
  charges: string
  recharge: string
  rechargeAmount: string
  casts: string[]
  effects: EffectForm[]
}

export interface BenefitForm {
  name: string
  text: string
  effects: EffectForm[]
}

export interface FeatForm extends Common {
  kind: 'feat'
  featKind: FeatKind
  prerequisite: string
  benefits: BenefitForm[]
}

export type BuilderForm = SpellForm | ConditionForm | ItemForm | MagicItemForm | FeatForm

export type FormOf<K extends BuilderKind> = Extract<BuilderForm, { kind: K }>

export const SPELL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const

/** The exporter's own spellings, the commonest on 2026-11-20, so a homebrew item shelves with its kind. */
export const ITEM_TYPES = [
  'Adventuring Gear',
  'Melee Weapon',
  'Ranged Weapon',
  'Ammunition',
  'Light Armor',
  'Medium Armor',
  'Heavy Armor',
  'Shield',
  "Artisan's Tools",
  'Tool',
  'Instrument',
  'Gaming Set',
  'Spellcasting Focus',
  'Food and Drink',
  'Trade Good',
  'Treasure (Gemstone)',
  'Treasure (Art Object)',
  'Mount',
  'Vehicle (Land)',
  'Vehicle (Water)',
] as const

export const MAGIC_ITEM_TYPES = [
  'Wondrous Item',
  'Ring',
  'Potion',
  'Scroll',
  'Wand',
  'Rod',
  'Staff',
  'Melee Weapon',
  'Ranged Weapon',
  'Ammunition',
  'Light Armor',
  'Medium Armor',
  'Heavy Armor',
  'Shield',
  'Spellcasting Focus',
] as const

export const RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'] as const

/** `recharge` as the exporter writes it; `''` is none. */
export const RECHARGES = [
  { value: '', label: 'Does not recharge' },
  { value: 'dawn', label: 'At dawn' },
  { value: 'dusk', label: 'At dusk' },
  { value: 'restShort', label: 'On a Short Rest' },
  { value: 'restLong', label: 'On a Long Rest' },
  { value: 'special', label: 'Special (in the text)' },
] as const

export const WEAPON_PROPERTIES = [
  'Ammunition',
  'Finesse',
  'Heavy',
  'Light',
  'Loading',
  'Range',
  'Reach',
  'Thrown',
  'Two-Handed',
  'Versatile',
] as const

export const MASTERIES = ['', 'Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'] as const

export const FEAT_KINDS: ReadonlyArray<{ value: FeatKind; label: string }> = [
  { value: 'origin', label: 'Origin' },
  { value: 'general', label: 'General' },
  { value: 'fighting_style', label: 'Fighting style' },
  { value: 'epic_boon', label: 'Epic boon' },
]

export const isWeaponType = (itemType: string): boolean => /\bweapon\b/i.test(itemType)
export const isArmorType = (itemType: string): boolean => /\barmou?r\b/i.test(itemType) || itemType === 'Shield'

/** A blank form for `kind`, the source and nothing else filled in. */
export function emptyForm<K extends BuilderKind>(kind: K, source: string): FormOf<K> {
  const common = { name: '', source, description: '' }
  const forms: { [P in BuilderKind]: FormOf<P> } = {
    spell: {
      ...common,
      kind: 'spell',
      level: '1',
      school: 'Evocation',
      castingTime: 'Action',
      range: '',
      components: 'V, S',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      classes: [],
      damageDice: '',
      damageType: '',
      upcastDice: '',
      upcastEvery: '1',
    },
    condition: { ...common, kind: 'condition' },
    item: {
      ...common,
      kind: 'item',
      itemType: 'Adventuring Gear',
      costGp: '',
      weight: '',
      weaponCategory: 'simple',
      damage: '',
      damageType: 'bludgeoning',
      versatileDamage: '',
      range: '',
      properties: [],
      mastery: '',
      ac: '',
      strength: '',
      stealthDisadvantage: false,
    },
    'magic-item': {
      ...common,
      kind: 'magic-item',
      itemType: 'Wondrous Item',
      rarity: 'uncommon',
      requiresAttunement: false,
      attunementRestriction: '',
      cursed: false,
      weight: '',
      charges: '',
      recharge: '',
      rechargeAmount: '',
      casts: [],
      effects: [],
    },
    feat: {
      ...common,
      kind: 'feat',
      featKind: 'general',
      prerequisite: '',
      description: 'You gain the following benefits.',
      benefits: [{ name: '', text: '', effects: [] }],
    },
  }
  return forms[kind]
}

/**
 * A fresh form with the fields a route's query names filled in (MYDND-257):
 * a conversion's "Create note" passes what D&D Beyond said of the feat, spell
 * or item it found no note for. Only the fields below are read, and each only
 * as a value its input could hold, so a query cannot put a form in a state its
 * own inputs could not reach. Anything else in the query is ignored.
 */
export function prefilledForm<K extends BuilderKind>(kind: K, source: string, query: URLSearchParams): FormOf<K> {
  const form: BuilderForm = emptyForm(kind, source)
  const name = query.get('name')?.trim()
  if (name) form.name = name
  const number = (key: string): string | null => {
    const v = query.get(key)?.trim()
    return v && /^\d+(\.\d+)?$/.test(v) ? v : null
  }
  const weight = number('weight')
  switch (form.kind) {
    case 'spell': {
      const level = query.get('level')
      if (level && /^[0-9]$/.test(level)) form.level = level
      const school = SPELL_SCHOOLS.find(s => s.toLowerCase() === query.get('school')?.toLowerCase())
      if (school) form.school = school
      break
    }
    case 'item': {
      const cost = number('costGp')
      if (cost) form.costGp = cost
      if (weight) form.weight = weight
      break
    }
    case 'magic-item': {
      const rarity = RARITIES.find(r => r === query.get('rarity')?.toLowerCase())
      if (rarity) form.rarity = rarity
      if (query.get('requiresAttunement') === 'true') form.requiresAttunement = true
      if (weight) form.weight = weight
      break
    }
    default:
      break
  }
  return form as FormOf<K>
}
