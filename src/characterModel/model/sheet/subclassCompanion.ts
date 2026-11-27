import { companionAc, companionAttack, companionHp, type Summoner } from '@vault/derive/companionFormulas.js'

import type { StatblockFence } from '../../../compendium'
import type { Sheet } from './sheet'
import { classesOfSheet } from '../spells/slots'

/**
 * The companions a subclass summons (MYDND-284): a Beast Master's primal
 * beast, a Battle Smith's Steel Defender, a Circle of Wildfire Druid's
 * Wildfire Spirit and a Drakewarden's drake.
 *
 * The Tamer's familiar (`FamiliarsTab`) is a builder pick stored in the
 * character's fence. These are not: each is fixed by the subclass, and its
 * numbers are formulas over the summoner ("13 plus your Wisdom modifier", "5
 * plus five times your Ranger level"), read off the creature's bestiary note
 * by `@vault/derive/companionFormulas.js`. Its hit points are tracked in
 * `vault-vitals`' `familiar_damage`, under `subclass:<key>`, beside the
 * familiar's.
 */

interface CompanionSpec {
  key: string
  subclass: RegExp
  className: string
  /** Bestiary note ids, the first the default. */
  monsters: readonly string[]
}

const SPECS: readonly CompanionSpec[] = [
  {
    key: 'beast-master',
    subclass: /^beast ?master( conclave)?$/i,
    className: 'ranger',
    monsters: ['beast-of-the-land', 'beast-of-the-sea', 'beast-of-the-sky'],
  },
  { key: 'battle-smith', subclass: /^battle ?smith$/i, className: 'artificer', monsters: ['steel-defender'] },
  { key: 'circle-of-wildfire', subclass: /^(circle of )?wildfire$/i, className: 'druid', monsters: ['wildfire-spirit'] },
  { key: 'drakewarden', subclass: /^drakewarden$/i, className: 'ranger', monsters: ['drake-companion'] },
]

export interface SubclassCompanion {
  /** `familiar_damage`'s key for this companion. */
  featureId: string
  subclass: string
  className: string
  /** The summoner's level in that class, which the formulas scale with. */
  level: number
  /** The creatures it may be, as bestiary note ids; one unless the subclass offers a choice. */
  monsters: readonly string[]
  /** The one picked, when the character's choices name it. */
  picked: string | null
}

const slug = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Which stat block a Beast Master picked, by note id: a Vault character's
 * Primal Companion answer (a `feature_option` in `featureChoices`), or a D&D
 * Beyond import's `feature_picks`. Null when neither names one.
 */
function pickedOf(spec: CompanionSpec, sheet: Sheet, json: object | null): string | null {
  if (spec.monsters.length < 2) return null
  const names: string[] = []
  const choices = (json as { featureChoices?: unknown } | null)?.featureChoices
  if (choices && typeof choices === 'object') {
    for (const answer of Object.values(choices as Record<string, unknown>)) {
      const name = (answer as { optionName?: unknown } | null)?.optionName
      if (typeof name === 'string') names.push(name)
    }
  }
  for (const p of sheet.feature_picks ?? []) names.push(p.feature, ...p.picks)
  return names.map(slug).find(id => spec.monsters.includes(id)) ?? null
}

/** The subclass companions this character has, in the order their subclasses are listed. */
export function subclassCompanions(sheet: Sheet, json: object | null = null): SubclassCompanion[] {
  const classes = classesOfSheet(sheet)
  return (sheet.subclasses ?? []).flatMap(name => {
    const spec = SPECS.find(s => s.subclass.test(name.trim()))
    if (!spec) return []
    const level = classes.find(c => c.name.toLowerCase() === spec.className)?.level ?? 0
    if (level <= 0) return []
    return [
      {
        featureId: `subclass:${spec.key}`,
        subclass: name,
        className: spec.className,
        level,
        monsters: spec.monsters,
        picked: pickedOf(spec, sheet, json),
      },
    ]
  })
}

/** The summoner the stat block's formulas refer to. */
export function summonerOf(sheet: Sheet, level: number): Summoner {
  const mods: Summoner['mods'] = {}
  for (const a of sheet.abilities ?? []) {
    const key = a.label.toLowerCase()
    if (key === 'str' || key === 'dex' || key === 'con' || key === 'int' || key === 'wis' || key === 'cha') mods[key] = a.mod
  }
  return { mods, pb: sheet.proficiency_bonus ?? 2, level, spellAttack: sheet.spellcasting?.attack ?? null }
}

export interface CompanionAttack {
  name: string
  toHit: number | null
  damage: string | null
}

export interface SubclassCompanionView {
  ac: number | null
  /** Null when the block's hit points are a formula this does not read. */
  maxHp: number | null
  hitDice: { total: number; die: number } | null
  speed: string | null
  stats: number[]
  /** Added to the creature's ability checks: Primal Bond adds the summoner's PB. */
  checkBonus: number
  attacks: CompanionAttack[]
}

/** The creature as this summoner makes it. */
export function subclassCompanionView(fence: StatblockFence | null, summoner: Summoner): SubclassCompanionView {
  const f = fence ?? {}
  const hp = companionHp(f.hp, summoner)
  const traits = Array.isArray(f.traits) ? f.traits : []
  const actions = Array.isArray(f.actions) ? f.actions : []
  const primalBond = traits.some(t => /^primal bond$/i.test((t?.name ?? '').trim()))
  return {
    ac: companionAc(f.ac, summoner),
    maxHp: hp?.max ?? null,
    hitDice: hp?.hitDie && hp.hitDice ? { total: hp.hitDice, die: hp.hitDie } : null,
    speed: typeof f.speed === 'string' ? f.speed : null,
    stats: Array.isArray(f.stats) ? f.stats.map(Number) : [],
    checkBonus: primalBond ? summoner.pb : 0,
    attacks: actions.flatMap(a => {
      const { toHit, damage } = companionAttack(a?.desc, summoner)
      return toHit === null && damage === null ? [] : [{ name: a?.name ?? 'Attack', toHit, damage }]
    }),
  }
}
