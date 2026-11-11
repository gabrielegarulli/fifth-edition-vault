import { abilityMod } from '@vault/derive/dnd5e.js'
import {
  avgHpPerHd,
  getCompanionAbilityScores,
  getCompanionAcBonus,
  getCompanionAttackBonus,
  getCompanionBonusHitDice,
  getCompanionDieSize,
  getCompanionExtraConditionImmunities,
  getCompanionExtraImmunities,
  getCompanionExtraResistances,
  getCompanionExtraSenses,
  getCompanionSaves,
  getCompanionScaling,
  getCompanionSize,
  getCompanionSpeeds,
  parseHpFormula,
} from '@vault/derive/tamerScaling.js'

/**
 * A familiar as the Tamer's level and its chosen improvements make it
 * (MYDND-59) — the web sheet's `FamiliarCard` arithmetic, over
 * `@vault/derive/tamerScaling.js`.
 *
 * MYDND-51 showed the creature as its statblock states it, believing the
 * improvements needed the `content_familiar_improvement` table the vault has no
 * notes for. They do not: every rule reads only the picks the builder stored on
 * the familiar (`slug`, `target`, `name`). The table is needed to *choose* an
 * improvement, not to apply one.
 *
 * The statblock is Fantasy Statblocks' (`stats: [14, 15, …]`, `hit_dice: 2d8 + 2`,
 * `speed: "40 ft., fly 60 ft."`), so it is adapted to the 5e.tools keys those
 * rules read (`str`…`cha`, `speed: { walk, fly }`) first.
 */

const KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export interface CompanionData {
  ac?: unknown
  hp?: unknown
  hit_dice?: unknown
  speed?: unknown
  stats?: unknown
  size?: unknown
  [k: string]: unknown
}

export interface CompanionView {
  /** After Tamer scaling, Toughen Up and Growth; the statblock's own number without a hit-dice formula. */
  maxHp: number
  hitDice: { total: number; die: number } | null
  /** Growth raised the die size, for every Hit Die. */
  dieUpgraded: boolean
  ac: number | null
  stats: number[]
  /** The speed line, raised by Speed Training. */
  speed: string | null
  /** Saving throws an improvement grants (Survival Instincts). */
  saves: Array<{ ability: string; bonus: number }>
  senses: string[]
  resistances: string[]
  immunities: string[]
  conditionImmunities: string[]
  /** Go for the Throat: + to natural-weapon attack and damage rolls. */
  attackBonus: number
  size: string | null
  /** The improvements chosen, by name. */
  improvements: string[]
}

const leadingNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const m = /-?\d+/.exec(String(v ?? ''))
  return m ? parseInt(m[0], 10) : null
}

/** `40 ft., fly 60 ft. (hover), swim 30 ft.` → `{ walk: 40, fly: 60, swim: 30 }`. */
export function parseSpeed(text: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of String(text ?? '').split(',')) {
    const m = /^\s*(?:([a-z]+)\s+)?(\d+)\s*ft/i.exec(part)
    if (m) out[(m[1] ?? 'walk').toLowerCase()] = Number(m[2])
  }
  return out
}

function formatSpeed(speeds: Record<string, { value: unknown }>): string {
  return Object.entries(speeds)
    .map(([type, s]) => (type === 'walk' ? `${s.value} ft.` : `${type} ${s.value} ft.`))
    .join(', ')
}

export function companionView(
  data: CompanionData | null | undefined,
  improvements: readonly unknown[] | null | undefined,
  tamerLevel: number,
  pb: number,
): CompanionView {
  const d = data ?? {}
  const imps = [...(improvements ?? [])]
  const raw = Array.isArray(d.stats) ? (d.stats as unknown[]).map(Number) : []
  const base = Object.fromEntries(KEYS.map((k, i) => [k, Number.isFinite(raw[i]) ? raw[i] : null]))
  const scores = getCompanionAbilityScores(base, imps) as Record<string, number | null>
  const stats = raw.length === 6 ? KEYS.map(k => scores[k] ?? 10) : []

  const formula = parseHpFormula(typeof d.hit_dice === 'string' ? d.hit_dice : null) as
    | { dice: number; die: number; mod: number }
    | null
  const scaling = getCompanionScaling(tamerLevel) as { hitDice: number }
  let maxHp = leadingNumber(d.hp) ?? 0
  let hitDice: CompanionView['hitDice'] = null
  let dieUpgraded = false
  if (formula) {
    const total = Math.max(formula.dice, scaling.hitDice) + getCompanionBonusHitDice(imps)
    const die = getCompanionDieSize(formula.die, imps) as number
    const conMod = abilityMod(scores.con ?? 10)
    maxHp = Math.max(1, total * (avgHpPerHd(die) + conMod))
    hitDice = { total, die }
    dieUpgraded = die !== formula.die
  }

  const baseAc = leadingNumber(d.ac)
  const acBonus = getCompanionAcBonus(imps, scores) as number
  const speeds = getCompanionSpeeds({ speed: parseSpeed(d.speed) }, imps) as Record<string, { value: unknown; boosted: boolean }>
  const boosted = Object.values(speeds).some(s => s.boosted)
  const saves = Object.entries(getCompanionSaves(base, imps, pb, scores) as Record<string, { bonus: number; granted: boolean }>)
    .filter(([, s]) => s.granted)
    .map(([ability, s]) => ({ ability, bonus: s.bonus }))

  return {
    maxHp,
    hitDice,
    dieUpgraded,
    ac: baseAc === null ? null : baseAc + acBonus,
    stats,
    speed: boosted ? formatSpeed(speeds) : typeof d.speed === 'string' ? d.speed : null,
    saves,
    senses: getCompanionExtraSenses(imps) as string[],
    resistances: getCompanionExtraResistances(imps) as string[],
    immunities: getCompanionExtraImmunities(imps) as string[],
    conditionImmunities: getCompanionExtraConditionImmunities(imps) as string[],
    attackBonus: getCompanionAttackBonus(imps) as number,
    size: (getCompanionSize(typeof d.size === 'string' ? d.size : null, imps) as string | null) ?? null,
    improvements: imps
      .map(i => (typeof i === 'string' ? i : ((i as { name?: string; slug?: string })?.name ?? (i as { slug?: string })?.slug ?? '')))
      .filter(Boolean),
  }
}

/** The character's Tamer level — the class the companion scales with. 0 without one. */
export function tamerLevelOf(json: { classes?: Array<{ name?: string | null; level?: number | null }> } | null | undefined): number {
  return (json?.classes ?? []).find(c => /^tamer\b/i.test(c?.name ?? ''))?.level ?? 0
}
