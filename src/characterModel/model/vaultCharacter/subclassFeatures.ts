import type { SheetAbility, SheetAttack, SheetFeatureDie, SheetSpellRider } from '../sheet/sheet'
import type { VaultCharacterJson } from './fence'

/**
 * What a subclass adds to a spell's roll and to the Combat tab (MYDND-285).
 *
 * **A table keyed by the subclass's name, as `subclassCompanions` is**
 * (MYDND-284). These features are prose in the subclass note, with no effect
 * to read: an effect naming a spell school or a damage type for a bonus does
 * not exist, and Sneak Attack, the one feature die before this, is a rule in
 * `vaultDerive.js` too. Each row names both editions' subclass where Lore has
 * both (Draconic Sorcery and Draconic Bloodline, Evoker and School of
 * Evocation).
 *
 * **Where both editions share a name, the class row's `source` decides**: a
 * 2014 Cleric (`PHB`) gains Disciple of Life at level 1, a 2024 one at 3, and a
 * 2014 Berserker's Frenzy is a bonus attack with no dice of its own.
 *
 * **Laid over on read, never projected**, as `spellDamageBonuses` is: the
 * amounts follow the scores, and a worn Headband moves them.
 */

interface Held {
  className: string
  /** The class row's `source`, uppercased; `''` when it has none. */
  source: string
  level: number
  subclass: string
}

const held = (json: VaultCharacterJson): Held[] =>
  (json.classes ?? []).flatMap(c =>
    c?.subclass?.name && c.name && c.level > 0
      ? [{ className: c.name, source: String(c.source ?? '').toUpperCase(), level: c.level, subclass: c.subclass.name }]
      : [],
  )

/** A 2014 class row: the 2014 rule, where the editions share a subclass name. */
const legacy = (h: Held): boolean => h.source === 'PHB'

const modOf = (abilities: readonly SheetAbility[], label: string): number =>
  abilities.find(a => a.label === label)?.mod ?? 0

/** `+5`, `-1`, or nothing for 0. */
const signed = (n: number): string => (n === 0 ? '' : `${n > 0 ? '+' : '-'}${Math.abs(n)}`)

/** The `feature_option` answer to the feature named `label`, if the builder stored one. */
function optionAnswer(json: VaultCharacterJson, label: string): { name: string; description: string } | null {
  for (const answer of Object.values(json.featureChoices ?? {})) {
    const a = answer as { type?: unknown; label?: unknown; optionName?: unknown; optionDescription?: unknown } | null
    if (a?.type === 'feature_option' && a.label === label && typeof a.optionName === 'string') {
      return { name: a.optionName, description: typeof a.optionDescription === 'string' ? a.optionDescription : '' }
    }
  }
  return null
}

const DRAGON_TYPES = ['acid', 'cold', 'fire', 'lightning', 'poison'] as const

/**
 * The Draconic sorcerer's element. The 2024 note asks it at Elemental Affinity
 * ("Fire Affinity"); the 2014 one at Dragon Ancestor, whose option says it
 * ("Fire damage, used by Elemental Affinity …"). Null when neither was asked,
 * and then no bonus, rather than a guessed one.
 */
function draconicElement(json: VaultCharacterJson): string | null {
  for (const label of ['Elemental Affinity', 'Dragon Ancestor']) {
    const answer = optionAnswer(json, label)
    if (!answer) continue
    const words = `${answer.name} ${answer.description}`.toLowerCase()
    const found = DRAGON_TYPES.find(t => new RegExp(`\\b${t}\\b`).test(words))
    if (found) return found
  }
  return null
}

/**
 * The spell riders a character's subclasses give: Elemental Affinity, Empowered
 * Evocation, Radiant Soul and Disciple of Life.
 */
export function subclassSpellRiders(json: VaultCharacterJson, abilities: readonly SheetAbility[]): SheetSpellRider[] {
  const out: SheetSpellRider[] = []
  for (const h of held(json)) {
    switch (h.subclass) {
      case 'Draconic Sorcery':
      case 'Draconic Bloodline': {
        const element = h.level >= 6 ? draconicElement(json) : null
        if (element) out.push({ name: 'Elemental Affinity', kind: 'damage', bonus: modOf(abilities, 'CHA'), damage_types: [element] })
        break
      }
      case 'Evoker':
      case 'School of Evocation':
        if (h.level >= 10) {
          out.push({ name: 'Empowered Evocation', kind: 'damage', bonus: modOf(abilities, 'INT'), schools: ['evocation'], list: 'Wizard' })
        }
        break
      case 'Celestial Patron':
      case 'The Celestial':
        if (h.level >= 6) {
          out.push({ name: 'Radiant Soul', kind: 'damage', bonus: modOf(abilities, 'CHA'), damage_types: ['radiant', 'fire'] })
        }
        break
      case 'Life Domain':
        if (h.level >= (legacy(h) ? 1 : 3)) {
          out.push({ name: 'Disciple of Life', kind: 'heal', bonus: 2, plus_rank: true, slot_only: true })
        }
        break
    }
  }
  // A modifier of 0 adds nothing; Disciple of Life always adds at least 3.
  return out.filter(r => r.bonus !== 0 || r.plus_rank)
}

/** The dice-only rows: what rides on another roll, Sneak Attack's kind. */
export function subclassFeatureDice(json: VaultCharacterJson, abilities: readonly SheetAbility[]): SheetFeatureDie[] {
  const out: SheetFeatureDie[] = []
  for (const h of held(json)) {
    switch (h.subclass) {
      case 'Hunter':
        // Hunter's Prey is a pick; Horde Breaker is an extra attack, not dice.
        if (h.level >= 3 && optionAnswer(json, "Hunter's Prey")?.name === 'Colossus Slayer') {
          out.push({ name: 'Colossus Slayer', formula: '1d8', activation: null })
        }
        break
      case 'Path of the Zealot':
        if (h.level >= 3) out.push({ name: 'Divine Fury', formula: `1d6+${Math.floor(h.level / 2)}`, activation: null })
        break
      case 'Path of the Berserker':
        // 2024: as many d6s as the Rage Damage bonus (+2, +3 at 9, +4 at 16).
        if (h.level >= 3 && !legacy(h)) {
          out.push({ name: 'Frenzy', formula: `${h.level >= 16 ? 4 : h.level >= 9 ? 3 : 2}d6`, activation: null })
        }
        break
      case 'Circle of Stars':
      case 'Circle of the Stars':
        if (h.level >= starryFormLevel(h)) {
          out.push({ name: 'Starry Form: Chalice', formula: `${starDice(h)}d8${signed(modOf(abilities, 'WIS'))}`, activation: null })
        }
        break
    }
  }
  return out
}

// Circle of Stars (TCE) has Starry Form at Druid 2, Circle of the Stars (XPHB)
// at 3; both double the die at 10 (Twinkling Constellations).
const starryFormLevel = (h: Held): number => (h.subclass === 'Circle of Stars' ? 2 : 3)
const starDice = (h: Held): number => (h.level >= 10 ? 2 : 1)

/**
 * The rows that roll to hit: Psychic Blades and its bonus-action blade, and the
 * Starry Form Archer. `source: 'feature'`, so the overlay's next read drops
 * and re-adds them like any feature line it owns.
 */
export function subclassAttacks(
  json: VaultCharacterJson,
  abilities: readonly SheetAbility[],
  pb: number,
): SheetAttack[] {
  const out: SheetAttack[] = []
  for (const h of held(json)) {
    switch (h.subclass) {
      case 'Soulknife':
        if (h.level >= 3) {
          // Finesse and thrown: the better of Strength and Dexterity.
          const mod = Math.max(modOf(abilities, 'STR'), modOf(abilities, 'DEX'))
          const blade = (name: string, die: string, activation: string): SheetAttack => ({
            name,
            source: 'feature',
            equipped: true,
            range: 'melee or 60 ft',
            activation,
            attack: pb + mod,
            damage: `${die}${signed(mod)}`,
            damageType: 'psychic',
            properties: ['Finesse', 'Thrown'],
          })
          out.push(blade('Psychic Blade', '1d6', 'action'), blade('Psychic Blade (second)', '1d4', 'bonus action'))
        }
        break
      case 'Circle of Stars':
      case 'Circle of the Stars':
        if (h.level >= starryFormLevel(h)) {
          const wis = modOf(abilities, 'WIS')
          out.push({
            name: 'Starry Form: Archer',
            source: 'feature',
            equipped: true,
            range: '60 ft',
            activation: 'bonus action',
            attack: pb + wis,
            damage: `${starDice(h)}d8${signed(wis)}`,
            damageType: 'radiant',
            properties: [],
          })
        }
        break
    }
  }
  return out
}

/** Every name the two functions above can write, so a re-read replaces rather than doubles. */
export const SUBCLASS_ROW_NAMES: ReadonlySet<string> = new Set([
  'Colossus Slayer',
  'Divine Fury',
  'Frenzy',
  'Starry Form: Chalice',
  'Starry Form: Archer',
  'Psychic Blade',
  'Psychic Blade (second)',
])

/**
 * Every subclass name the three functions above read, so `realVault.test.ts`
 * notices a renamed note: the table keys on the name, and a miss is silent.
 */
export const SUBCLASSES_READ: readonly string[] = [
  'Draconic Sorcery',
  'Draconic Bloodline',
  'Evoker',
  'School of Evocation',
  'Celestial Patron',
  'The Celestial',
  'Life Domain',
  'Hunter',
  'Path of the Zealot',
  'Path of the Berserker',
  'Circle of Stars',
  'Circle of the Stars',
  'Soulknife',
]
