// @ts-check

// A subclass companion's numbers, read off its stat block's own words
// (MYDND-284).
//
// The companions a subclass summons (a Beast Master's primal beast, a Battle
// Smith's Steel Defender, a Wildfire Spirit, a Drake Companion) print their AC
// and hit points as formulas over the summoner: "13 plus your Wisdom
// modifier", "14 + PB", "5 plus five times your Ranger level (the beast has a
// number of Hit Dice [d8s] equal to your Ranger level)". These read those
// words rather than a table of four creatures, so a homebrew companion that
// writes its block the same way works too, and a block that does not reads as
// unknown rather than as a wrong number.

/** @typedef {'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'} AbilityKey */
/**
 * What the formulas may refer to.
 *
 * @typedef {{ mods: Partial<Record<AbilityKey, number>>, pb: number, level: number, spellAttack?: number | null }} Summoner
 */

/** @type {Record<string, AbilityKey>} */
const ABILITY = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

/** @type {Record<string, number>} */
const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

const PLUS = String.raw`\s*(?:\+|plus)\s*`

/**
 * @param {string} word
 * @returns {number | null}
 */
function count(word) {
  const w = word.toLowerCase()
  if (/^\d+$/.test(w)) return parseInt(w, 10)
  return WORD[w] ?? null
}

/**
 * The added terms after a leading number: "your Wisdom modifier", "PB", "your
 * proficiency bonus". Null when a term is not one of those.
 *
 * @param {string} rest
 * @param {Summoner} s
 * @returns {number | null}
 */
function addends(rest, s) {
  let total = 0
  let text = rest.trim()
  while (text) {
    const term = new RegExp(
      String.raw`^${PLUS}(your\s+)?(\w+)\s+modifier\b|^${PLUS}(PB|(your\s+)?proficiency\s+bonus)\b|^${PLUS}(\d+)\b`,
      'i',
    ).exec(text)
    if (!term) return null
    if (term[5]) {
      total += parseInt(term[5], 10)
    } else if (term[2]) {
      const key = ABILITY[term[2].toLowerCase()]
      if (!key) return null
      total += s.mods[key] ?? 0
    } else {
      total += s.pb
    }
    text = text.slice(term[0].length).trim()
  }
  return total
}

/**
 * A companion's Armor Class from its stat block's `ac`: a number, "13 (natural
 * armor)", "13 plus your Wisdom modifier", "12 + your Intelligence modifier" or
 * "14 + PB (natural armor)". Null for anything else.
 *
 * @param {unknown} ac
 * @param {Summoner} s
 * @returns {number | null}
 */
export function companionAc(ac, s) {
  if (typeof ac === 'number' && Number.isFinite(ac)) return ac
  if (typeof ac !== 'string') return null
  const text = ac.replace(/\([^)]*\)/g, '').trim()
  const m = /^(\d+)(.*)$/.exec(text)
  if (!m) return null
  const more = addends(m[2], s)
  return more === null ? null : parseInt(m[1], 10) + more
}

/**
 * A companion's hit point maximum and Hit Dice from its stat block's `hp`:
 * "5 plus five times your Ranger level (the beast has a number of Hit Dice
 * [d8s] equal to your Ranger level)". A plain number stands as it is. `hitDie`
 * is null when the block names none (the Wildfire Spirit).
 *
 * @param {unknown} hp
 * @param {Summoner} s
 * @returns {{ max: number, hitDie: number | null, hitDice: number | null } | null}
 */
export function companionHp(hp, s) {
  if (typeof hp === 'number' && Number.isFinite(hp)) return { max: hp, hitDie: null, hitDice: null }
  if (typeof hp !== 'string') return null
  const leading = /^\s*(\d+)\b/.exec(hp)
  if (!leading) return null
  const formula = new RegExp(String.raw`^\s*(\d+)${PLUS}(\w+)\s+times\s+your\s+\w+\s+level`, 'i').exec(hp)
  let max = parseInt(leading[1], 10)
  if (formula) {
    const times = count(formula[2])
    if (times === null) return null
    max += times * s.level
  } else if (/\byour\b/i.test(hp)) {
    // A formula this does not read: say unknown, never the leading number.
    return null
  }
  const die = /Hit Dice\s*\[d(\d+)s?\]\s*equal to your \w+ level/i.exec(hp)
  return die ? { max, hitDie: parseInt(die[1], 10), hitDice: s.level } : { max, hitDie: null, hitDice: null }
}

/**
 * A number the stat block writes against the summoner, inside an action's or
 * a save's text: "+3 plus PB", "1 + PB". Null when the text is not that.
 *
 * @param {string} text
 * @param {Summoner} s
 * @returns {number | null}
 */
export function companionNumber(text, s) {
  const m = /^\s*([+-]?\d+)(.*)$/.exec(text)
  if (!m) return null
  const more = addends(m[2], s)
  return more === null ? null : parseInt(m[1], 10) + more
}

/**
 * An attack action's roll and damage, read off its text: "*Melee Attack Roll:*
 * Bonus equals your spell attack modifier, reach 5 ft. *Hit:* 1d8 + 2 plus your
 * Intelligence modifier Force damage", or "*Melee Weapon Attack:* +3 plus PB to
 * hit … *Hit:* 1d6 plus PB piercing damage". Each half is null when it is not
 * there or not readable; both null for an action that is no attack.
 *
 * @param {string | null | undefined} desc
 * @param {Summoner} s
 * @returns {{ toHit: number | null, damage: string | null }}
 */
export function companionAttack(desc, s) {
  const text = desc ?? ''
  /** @type {number | null} */
  let toHit = null
  const attack = /Attack(?: Roll)?:\*\s*(.+?)(?:\s+to hit|,\s*(?:reach|range))/i.exec(text)
  if (attack) {
    const words = attack[1].trim()
    if (/^(bonus equals )?your spell attack modifier$/i.test(words)) toHit = s.spellAttack ?? null
    else toHit = companionNumber(words, s)
  }
  /** @type {string | null} */
  let damage = null
  const hit = new RegExp(
    String.raw`\*Hit:\*\s*(\d+d\d+)((?:${PLUS}(?:\d+\b|PB\b|(?:your\s+)?\w+\s+modifier\b))*)`,
    'i',
  ).exec(text)
  if (hit) {
    const more = addends(hit[2], s)
    if (more !== null) damage = more === 0 ? hit[1] : `${hit[1]} ${more < 0 ? '-' : '+'} ${Math.abs(more)}`
  }
  return { toHit, damage }
}
