import { abilityMod } from './dnd5e.js'


const ZERO = { improvements: 0, hitDice: 0 }

export const BESPOKE_COMPANION_TABLE = [
  null,
  { improvements: 0,  hitDice: 2 },
  { improvements: 1,  hitDice: 2 },
  { improvements: 2,  hitDice: 3 },
  { improvements: 3,  hitDice: 4 },
  { improvements: 4,  hitDice: 5 },
  { improvements: 5,  hitDice: 5 },
  { improvements: 6,  hitDice: 5 },
  { improvements: 7,  hitDice: 6 },
  { improvements: 8,  hitDice: 6 },
  { improvements: 9,  hitDice: 6 },
  { improvements: 10, hitDice: 7 },
  { improvements: 11, hitDice: 8 },
  { improvements: 12, hitDice: 9 },
  { improvements: 13, hitDice: 9 },
  { improvements: 14, hitDice: 9 },
  { improvements: 15, hitDice: 10 },
  { improvements: 16, hitDice: 11 },
  { improvements: 17, hitDice: 11 },
  { improvements: 18, hitDice: 12 },
  { improvements: 19, hitDice: 12 },
]

// Looks up the bespoke scaling cell for a tamer level. `hitDice` is the
// companion's TOTAL Hit Dice at that level (not a delta), so the caller can
// subtract the base statblock's HD to get the extra Hit Dice to apply.
export function getCompanionScaling(tamerLevel) {
  const lvl = Number(tamerLevel)
  if (!Number.isFinite(lvl) || lvl < 1 || lvl > 20) return ZERO
  return BESPOKE_COMPANION_TABLE[lvl] ?? ZERO
}

// Parses a 5e.tools-style HP formula ("1d4 + 2", "3d8 - 3") into its parts.
// Returns null when the string doesn't match the standard NdM±K shape.
export function parseHpFormula(formula) {
  if (!formula) return null
  const m = String(formula).match(/(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?/i)
  if (!m) return null
  const mod = m[3] ? Number(m[3].replace(/\s+/g, '')) : 0
  return { dice: Number(m[1]), die: Number(m[2]), mod }
}

// 5e "fixed value" Hit Die rounding used for HP gained on level-up:
// (die / 2) + 1. d4→3, d6→4, d8→5, d10→6, d12→7.
export function avgHpPerHd(die) {
  if (!die) return 0
  return Math.floor(die / 2) + 1
}

// Standard 5e Hit Die progression. Each Growth-style improvement bumps the
// companion one step up the ladder (d4 → d6 → d8 → d10 → d12).
const HIT_DIE_PROGRESSION = [4, 6, 8, 10, 12]

export function getCompanionDieSize(baseDie, improvements = []) {
  const baseIdx = HIT_DIE_PROGRESSION.indexOf(Number(baseDie))
  if (baseIdx < 0) return Number(baseDie) || 0
  const growthCount = (improvements ?? []).filter(isGrowthImprovement).length
  const idx = Math.min(baseIdx + growthCount, HIT_DIE_PROGRESSION.length - 1)
  return HIT_DIE_PROGRESSION[idx]
}

// Counts "Toughen Up" improvements, each of which grants the companion one
// additional Hit Die on top of its tamer-level total. Repeatable, so several
// stack (6 picks → +6 Hit Dice).
export function getCompanionBonusHitDice(improvements = []) {
  return (improvements ?? []).filter(isToughenUpImprovement).length
}

function isToughenUpImprovement(imp) {
  if (!imp) return false
  const tag = typeof imp === 'string' ? imp : (imp.slug ?? imp.id ?? imp.name ?? '')
  return String(tag).toLowerCase().startsWith('toughen')
}

// Counts "Go for the Throat" improvements. Each grants a +1 bonus to the
// companion's natural-weapon / unarmed attack and damage rolls, and they stack
// (the build-time cap by tamer level is enforced in the picker).
export function getCompanionAttackBonus(improvements = []) {
  return (improvements ?? []).filter(imp => {
    const tag = typeof imp === 'string' ? imp : (imp?.slug ?? imp?.id ?? imp?.name ?? '')
    return String(tag).toLowerCase().startsWith('go-for')
  }).length
}

export const COMPANION_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

// Builds the companion's saving-throw map: the base statblock saves plus any
// proficiencies granted by "Survival Instincts" improvements. A granted save
// is computed as the (possibly boosted) ability modifier plus the companion's
// proficiency bonus (the tamer's PB). Saves the creature already has are left
// untouched — proficiency doesn't stack. Returns { [ability]: { bonus, granted } }.
export function getCompanionSaves(data = {}, improvements = [], pb = 2, abilityScores = {}) {
  const out = {}
  for (const [key, bonus] of Object.entries(data?.save ?? {})) {
    out[key] = { bonus, granted: false }
  }
  for (const imp of improvements ?? []) {
    if (!imp || typeof imp !== 'object') continue
    if (imp.slug !== 'survival-instincts') continue
    const target = imp.target
    if (!target || out[target]) continue
    const score = abilityScores?.[target] ?? data?.[target]
    if (score == null) continue
    out[target] = { bonus: abilityMod(score) + pb, granted: true }
  }
  return out
}

// Applies "Speed Training" improvements to the companion's speeds. Each pick
// adds 15 ft to its chosen speed, capped at 150% of that speed's base value
// rounded up to the nearest 5 ft. Returns { [type]: { value, boosted, condition } }.
export function getCompanionSpeeds(data = {}, improvements = []) {
  const counts = {}
  for (const imp of improvements ?? []) {
    if (!imp || typeof imp !== 'object') continue
    if (imp.slug !== 'speed-training' || !imp.target) continue
    counts[imp.target] = (counts[imp.target] ?? 0) + 1
  }
  const out = {}
  for (const [type, val] of Object.entries(data?.speed ?? {})) {
    const isObj = val != null && typeof val === 'object'
    const baseNum = isObj ? val.number : val
    const condition = isObj ? val.condition : undefined
    if (typeof baseNum !== 'number') {
      out[type] = { value: baseNum, boosted: false, condition }
      continue
    }
    const picks = counts[type] ?? 0
    if (picks === 0) {
      out[type] = { value: baseNum, boosted: false, condition }
      continue
    }
    const cap = Math.ceil((baseNum * 1.5) / 5) * 5
    const value = Math.min(baseNum + 15 * picks, cap)
    out[type] = { value, boosted: value > baseNum, condition }
  }
  return out
}

// Applies "Ability Boost" universal improvements on top of the companion's
// base statblock scores. Each Ability Boost adds +1 to its chosen ability,
// capped at 20; the improvement is repeatable, so several may stack. Entries
// without a target (older saves made before targets were captured) are skipped.
export function getCompanionAbilityScores(data = {}, improvements = []) {
  const scores = {}
  for (const key of COMPANION_ABILITY_KEYS) {
    const base = data?.[key]
    scores[key] = base == null ? null : Number(base)
  }
  for (const imp of improvements ?? []) {
    if (!imp) continue
    const slug = typeof imp === 'string' ? imp : imp.slug
    if (slug !== 'ability-boost') continue
    const target = typeof imp === 'object' ? imp.target : null
    if (!target || scores[target] == null) continue
    scores[target] = Math.min(20, scores[target] + 1)
  }
  return scores
}


// "Unarmored defense"-style AC bonuses. Value is a flat number, or an
// ability key to read the companion's (possibly boosted) modifier from.
const AC_BONUS_SLUGS = {
  'aboling-rubbery-hide-i': 2,
  'aboling-rubbery-hide-ii': 2,
  'dragonling-harden-i': 2,
  'dragonling-harden-ii': 2,
  'minimic-thick-skin': 2,
  'rakitten-rakish-resilience': 'cha',
}

// Sums the AC bonus granted by bespoke unarmored-defense improvements.
export function getCompanionAcBonus(improvements = [], abilityScores = {}) {
  let bonus = 0
  for (const imp of improvements ?? []) {
    const slug = typeof imp === 'string' ? imp : imp?.slug
    const val = AC_BONUS_SLUGS[slug]
    if (val == null) continue
    bonus += typeof val === 'number' ? val : abilityMod(abilityScores?.[val])
  }
  return bonus
}

const SENSE_GRANT_SLUGS = { 'dragonling-blindsight': 'blindsight 15 ft.' }
const RESISTANCE_GRANT_SLUGS = { 'sunsnacker-flame-retardant': 'fire' }
const IMMUNITY_GRANT_SLUGS = { 'hyphan-damp-dark-dweller': 'necrotic' }
const CONDITION_IMMUNITY_GRANT_SLUGS = { 'tarling-titanspawn': ['charmed', 'frightened'] }

function collectGrants(improvements, map) {
  const out = []
  for (const imp of improvements ?? []) {
    const slug = typeof imp === 'string' ? imp : imp?.slug
    const grant = map[slug]
    if (!grant) continue
    if (Array.isArray(grant)) out.push(...grant)
    else out.push(grant)
  }
  return out
}

// Extra permanent senses (e.g. Dragonling's Blindsight) granted by bespoke
// improvements, formatted the same way as the base statblock's `senses` list.
export function getCompanionExtraSenses(improvements = []) {
  return collectGrants(improvements, SENSE_GRANT_SLUGS)
}

// Extra permanent damage resistances granted by bespoke improvements.
export function getCompanionExtraResistances(improvements = []) {
  return collectGrants(improvements, RESISTANCE_GRANT_SLUGS)
}

// Extra permanent damage immunities granted by bespoke improvements.
export function getCompanionExtraImmunities(improvements = []) {
  return collectGrants(improvements, IMMUNITY_GRANT_SLUGS)
}

// Extra permanent condition immunities granted by bespoke improvements.
export function getCompanionExtraConditionImmunities(improvements = []) {
  return collectGrants(improvements, CONDITION_IMMUNITY_GRANT_SLUGS)
}

// Standard armor-tier progression used to gate "War Training" picks — a
// companion can't gain Medium/Heavy proficiency until an earlier War
// Training pick already granted the tier below it.
export const ARMOR_TRAINING_TIERS = ['Light Armor', 'Medium Armor', 'Heavy Armor']

// Collects the armor types and weapons a companion is proficient with from
// its "War Training" picks. Each pick grants either one armor tier or two
// named weapons; both kinds accumulate across repeated picks.
export function getCompanionProficiencies(improvements = []) {
  const armor = []
  const weapons = []
  for (const imp of improvements ?? []) {
    if (!imp || typeof imp !== 'object' || imp.slug !== 'war-training') continue
    const target = imp.target
    if (!target) continue
    if (target.kind === 'armor' && target.armor) armor.push(target.armor)
    if (target.kind === 'weapons') {
      for (const w of target.weapons ?? []) if (w) weapons.push(w)
    }
  }
  return { armor, weapons }
}

const SIZE_ORDER = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']
const SIZE_CODE = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' }

// Steps the companion's size up one category per Growth improvement, capped at
// Gargantuan. Accepts a full word ("Tiny"), a 5e.tools code ("T"), or a
// single-element array of either; returns the display word, or the original
// value unchanged when it isn't a recognised size.
export function getCompanionSize(baseSize, improvements = []) {
  const raw = Array.isArray(baseSize) ? baseSize[0] : baseSize
  if (raw == null) return raw
  const word = SIZE_CODE[raw]
    ?? (typeof raw === 'string' ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : raw)
  const idx = SIZE_ORDER.indexOf(word)
  if (idx < 0) return word
  const growthCount = (improvements ?? []).filter(isGrowthImprovement).length
  return SIZE_ORDER[Math.min(idx + growthCount, SIZE_ORDER.length - 1)]
}

// Number of Growth improvements taken. Each Growth step raises the companion's
// natural-weapon damage die one rung up the standard die ladder (mirrors the
// Hit Die and size steps), so display code can bump the bite's damage dice.
export function getCompanionGrowthSteps(improvements = []) {
  return (improvements ?? []).filter(isGrowthImprovement).length
}

function isGrowthImprovement(imp) {
  if (!imp) return false
  if (typeof imp === 'string') return imp.toLowerCase().startsWith('growth')
  if (imp.type === 'growth') return true
  const tag = String(imp.id ?? imp.name ?? '').toLowerCase()
  return tag.startsWith('growth')
}
