export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100]

export const chipLabel = (count, sides, modifier = 0) => {
  const base = `${count !== 1 ? count : ''}d${sides}`
  if (!modifier) return base
  return `${base}${modifier > 0 ? '+' : ''}${modifier}`
}
export const rollDie = (sides) => Math.floor(Math.random() * sides) + 1
export const rollDice = (count, sides) => Array.from({ length: count }, () => rollDie(sides))

const ROLL_TYPES = new Set(['attack', 'damage', 'saving_throw', 'ability_check', 'skill_check', 'initiative', 'other'])
const DAMAGE_TYPES = new Set(['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder', 'healing'])
const ABILITIES = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
const MODES = new Set(['advantage', 'disadvantage'])

// Returns [{count, sides, modifier}] — one entry per dice group.
// The flat modifier accumulates onto whichever dice group precedes it.
// e.g. "2d6+1d8+3" → [{count:2,sides:6,modifier:0}, {count:1,sides:8,modifier:3}]
export function parseDiceExpression(str) {
  const tokens = str.trim().toLowerCase().split(/(?=[+-])/).filter(Boolean)
  const groups = []
  let pending = 0

  for (const token of tokens) {
    const dm = token.match(/^([+-]?)(\d+)d(\d+)$/)
    if (dm) {
      if (groups.length > 0) { groups[groups.length - 1].modifier += pending; pending = 0 }
      groups.push({ count: parseInt(dm[2], 10), sides: parseInt(dm[3], 10), modifier: 0 })
      continue
    }
    const nm = token.match(/^([+-]?\d+)$/)
    if (nm) { pending += parseInt(nm[1], 10); continue }
    return null
  }
  if (groups.length > 0) groups[groups.length - 1].modifier += pending
  return groups.length > 0 ? groups : null
}

export const DAMAGE_TYPE_LIST = 'acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder|healing'

export function injectDiceTokens(text) {
  if (!text || typeof text !== 'string') return text
  let result = text

  // "(NdN ± M) Type damage" → "[NdN±M, damage, type] Type damage"
  result = result.replace(
    new RegExp(`\\((\\d+d\\d+(?:\\s*[+\\-]\\s*\\d+)?)\\)\\s+(${DAMAGE_TYPE_LIST})\\s+damage`, 'gi'),
    (_, dice, dtype) => `[${dice.replace(/\s+/g, '')}, damage, ${dtype.toLowerCase()}] ${dtype} damage`
  )

  // "Attack Roll: ±N" → "Attack Roll: [1d20±N, attack]" (5e 2024 format)
  result = result.replace(
    /(\bAttack Roll: )([+-]\d+)/gi,
    (_, prefix, bonus) => `${prefix}[1d20${bonus}, attack]`
  )

  // "Attack: ±N to hit" → "Attack: [1d20±N, attack] to hit" (5e 2014 format)
  result = result.replace(
    /(\bAttack: )([+-]\d+)( to hit)/gi,
    (_, prefix, bonus, suffix) => `${prefix}[1d20${bonus}, attack]${suffix}`
  )

  return result
}

export function parseRollToken(raw) {
  const parts = raw.split(',').map(s => s.trim().toLowerCase())
  const chips = parseDiceExpression(parts[0])
  if (!chips) return null
  let mode = 'normal', rollType = null, damageType = null, ability = null
  for (const p of parts.slice(1)) {
    if (MODES.has(p)) mode = p
    else if (ROLL_TYPES.has(p)) rollType = p
    else if (DAMAGE_TYPES.has(p)) damageType = p
    else if (ABILITIES.has(p)) ability = p
  }
  return { chips, mode, rollType, damageType, ability }
}
