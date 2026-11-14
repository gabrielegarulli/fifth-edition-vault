
const ZERO = [0, 0, 0, 0, 0, 0, 0, 0, 0]

const FULL = [
  ZERO,
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

const HALF = [
  ZERO,
  ZERO,
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
]

const HALF_2024 = [
  ZERO,
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
]

const THIRD = [
  ZERO,
  ZERO,
  ZERO,
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
]

// Pact magic uses a single slot rank that scales; only one slot rank is
// "live" at a time. Encoded as [count, rank] per class level. Translated to
// the rank-indexed array by the caller.
const PACT = [
  [0, 0],
  [1, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [2, 3],
  [2, 4],
  [2, 4],
  [2, 5],
  [2, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [4, 5],
  [4, 5],
  [4, 5],
  [4, 5],
]

/** @type {Readonly<Record<string, number[][]>>} */
const TABLES = { '1': FULL, '1/2': HALF, '1/2-2024': HALF_2024, '1/3': THIRD }

/**
 * @param {string | null | undefined} progression
 * @param {number} classLevel
 * @returns {number[]} slot maxima, index 0 the 1st rank
 */
export function slotsForClassLevel(progression, classLevel) {
  if (!progression || classLevel < 1 || classLevel > 20) return ZERO.slice()
  if (progression === 'pact') {
    const [count, rank] = PACT[classLevel] ?? [0, 0]
    const row = ZERO.slice()
    if (rank > 0) row[rank - 1] = count
    return row
  }
  const table = TABLES[progression]
  return table ? table[classLevel].slice() : ZERO.slice()
}

// Progression archetype by class name, for DDB payloads where the class rows
// carry no casterProgression string. Third casters (Eldritch Knight, Arcane
// Trickster) are subclass-based and not detectable from DDB class names —
// intentionally absent. Paladin and Ranger stay on '1/2' here: this map serves
// DDB characters, which are 2014 sheets. A vault Paladin never reaches this
// function — SpellPanel reads content_class.data.casterProgression directly.
/** @type {Readonly<Record<string, string>>} */
const CLASS_PROGRESSION = {
  wizard: '1', cleric: '1', druid: '1', bard: '1', sorcerer: '1',
  paladin: '1/2', ranger: '1/2', artificer: '1/2',
  warlock: 'pact',
}

// Combined slot maxima for a set of classes: [{ name, level }] → { rank: count }.
// A single slot-casting class uses its own progression table (a lone Paladin 3
// has 3 first-rank slots, not the multiclass floor). Multiple slot-casting
// classes use the 5e multiclass rule: full levels + floor(half/2) + ceil for
// Artificer, summed into the full-caster table. Pact (Warlock) slots stack on
// top independently in both cases.
/**
 * @param {readonly { name?: string | null, level?: number | null }[] | null | undefined} classes
 * @returns {Record<number, number>}
 */
export function combinedSlotMax(classes) {
  return combinedSlotMaxFor((classes ?? []).map(cls => ({
    name: cls.name ?? '',
    level: cls.level ?? 0,
    progression: CLASS_PROGRESSION[(cls.name ?? '').toLowerCase()] ?? null,
  })))
}

// The same rule from explicit progressions rather than from class names. A Vault
// Character's progression is whatever `content_class.data.casterProgression`
// says, which is authoritative and may belong to a homebrew class whose name
// this module has never heard of — CLASS_PROGRESSION exists only to serve DDB
// payloads, where the class rows carry no progression at all.
//
// entries: [{ name, level, progression }]. `name` is used solely for the
// Artificer's rounding exception.
/**
 * @param {readonly { name?: string | null, level?: number | null, progression?: string | null }[] | null | undefined} entries
 * @returns {Record<number, number>} slot count by rank
 */
export function combinedSlotMaxFor(entries) {
  /** @type {{ name: string, progression: string, level: number }[]} */
  const slotClasses = []
  let pactLevel = 0

  for (const entry of entries ?? []) {
    const level = entry.level ?? 0
    if (level < 1 || !entry.progression) continue
    if (entry.progression === 'pact') pactLevel += level
    else slotClasses.push({ name: (entry.name ?? '').toLowerCase(), progression: entry.progression, level })
  }

  /** @type {Record<number, number>} */
  const map = {}
  /** @param {readonly number[]} row */
  const addRow = (row) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] > 0) map[i + 1] = (map[i + 1] ?? 0) + row[i]
    }
  }

  if (slotClasses.length === 1) {
    const { progression, level } = slotClasses[0]
    addRow(slotsForClassLevel(progression, Math.min(level, 20)))
  } else if (slotClasses.length > 1) {
    let combined = 0
    for (const { name, progression, level } of slotClasses) {
      if (progression === '1') combined += level
      // '1/2-2024' is a half caster for every purpose but its first row, and
      // the multiclass rule counts levels, not rows. Omitting it here counted a
      // Vault Paladin as contributing nothing to a multiclass slot total.
      else if (progression === '1/2' || progression === '1/2-2024') {
        combined += name === 'artificer' ? Math.ceil(level / 2) : Math.floor(level / 2)
      } else if (progression === '1/3') combined += Math.floor(level / 3)
    }
    if (combined > 0) addRow(slotsForClassLevel('1', Math.min(combined, 20)))
  }

  if (pactLevel > 0) addRow(slotsForClassLevel('pact', Math.min(pactLevel, 20)))

  return map
}

// The highest rank with at least one slot in a combined map, or 0.
/**
 * @param {Readonly<Record<string, number>> | null | undefined} slotMap
 * @returns {number}
 */
export function highestRankIn(slotMap) {
  const map = slotMap ?? {}
  let highest = 0
  for (const rank of Object.keys(map)) {
    const n = Number(rank)
    if (map[rank] > 0 && n > highest) highest = n
  }
  return highest
}

// Highest slot rank (1–9) the character has unlocked, or 0 if none. Used by
// the Add-Spell drawer to gate "must be a level for which you have slots".
/**
 * @param {string | null | undefined} progression
 * @param {number} classLevel
 * @returns {number}
 */
export function highestUnlockedRank(progression, classLevel) {
  const row = slotsForClassLevel(progression, classLevel)
  for (let i = row.length - 1; i >= 0; i--) {
    if (row[i] > 0) return i + 1
  }
  return 0
}
