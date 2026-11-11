export const RANK_LABEL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th' }
export const LEVEL_LABEL = (lvl) => lvl === 0 ? 'Cantrip' : `${RANK_LABEL[lvl] ?? lvl} level`

export const SCHOOL_LETTERS = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  I: 'Illusion', N: 'Necromancy', T: 'Transmutation', V: 'Evocation',
}
export const schoolLabel = (s) => SCHOOL_LETTERS[s] ?? s

export const SAVE_ABBREV = {
  strength: 'Str', dexterity: 'Dex', constitution: 'Con',
  intelligence: 'Int', wisdom: 'Wis', charisma: 'Cha',
}

export function scaleCantrip(basePairs, higherLevel, charLevel) {
  if (!charLevel || basePairs.length === 0) return basePairs
  const multiplier = charLevel >= 17 ? 4 : charLevel >= 11 ? 3 : charLevel >= 5 ? 2 : 1
  if (multiplier === 1) return basePairs

  if (higherLevel) {
    const thresholds = new Map()
    for (const m of higherLevel.matchAll(/\b(5|11|17)\b[^(]*\((\d*d\d+)\)/gi)) {
      const dice = m[2].startsWith('d') ? `1${m[2]}` : m[2]
      thresholds.set(parseInt(m[1]), dice)
    }
    if (thresholds.size > 0) {
      const best = [17, 11, 5].find(l => charLevel >= l && thresholds.has(l))
      if (best) return [{ dice: thresholds.get(best), type: basePairs[0].type }]
      return basePairs
    }
  }

  return basePairs.map(p => {
    const m = p.dice.match(/^(\d+)(d\d+)$/)
    if (!m) return p
    return { dice: `${parseInt(m[1]) * multiplier}${m[2]}`, type: p.type }
  })
}

export function deriveSpellMeta(data) {
  const d = typeof data === 'string' ? { description: data } : (data ?? {})
  const prose = proseSpellMeta(d.description)

  const structuredSave = Array.isArray(d.saving_throw) && d.saving_throw.length > 0
    ? (SAVE_ABBREV[d.saving_throw[0]] ?? d.saving_throw[0])
    : null

  return {
    // The prose wins on damage, and that is deliberate: `damage_dice` is a
    // single expression, so preferring it would collapse a spell that deals two
    // damage types down to one roll. The structured value fills in only where
    // the regex found nothing at all, which is a strict gain.
    damagePairs: prose.damagePairs.length > 0 ? prose.damagePairs : structuredDamagePairs(d),
    // No structured source for this one — 5e.tools does not record it in a form
    // this catalog imported, so the prose is still the only answer.
    isAttack: prose.isAttack,
    saveAbility: structuredSave ?? prose.saveAbility,
  }
}

function structuredDamagePairs(data) {
  const dice = data.damage_dice
  if (!dice) return []
  const types = Array.isArray(data.damageTypes) ? data.damageTypes : []
  // Exactly one type, or the pairing is a guess: two types and one expression
  // cannot say which damage is which, and the prose already declined to.
  return types.length === 1 ? [{ dice, type: types[0] }] : []
}

function proseSpellMeta(description) {
  if (!description) return { damagePairs: [], isAttack: false, saveAbility: null }
  const seen = new Set()
  const damagePairs = []
  for (const m of description.matchAll(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)\s+damage/gi)) {
    const dice = m[1].replace(/\s+/g, '')
    const type = m[2].toLowerCase()
    const key = `${dice}:${type}`
    if (!seen.has(key)) { seen.add(key); damagePairs.push({ dice, type }) }
  }
  const isAttack = /spell attack/i.test(description)
  const saveMatch = description.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i)
  const saveAbility = saveMatch ? (SAVE_ABBREV[saveMatch[1].toLowerCase()] ?? saveMatch[1]) : null
  return { damagePairs, isAttack, saveAbility }
}
