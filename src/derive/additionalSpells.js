/**
 * 5e.tools' `additionalSpells`, read as a rule — VAULT-264.
 *
 * A class or subclass row carries the spells it hands over outside the caster's
 * caps as 5e.tools writes them, and until this module nothing read them: a Life
 * Cleric had no domain spells, a College of Lore Bard was never asked for
 * Magical Discoveries, an Abjurer never for the spells Abjuration Savant writes
 * into the book, and an Arcane Trickster had no Mage Hand.
 *
 * The shape, as far as this module reads it:
 *
 *   additionalSpells:          # an array: one block, or alternatives
 *     - name: Arid Land        # an alternative's name (Circle of the Land)
 *       prepared:              # always prepared
 *         "3": [blur|xphb, …]  # keyed by the class level that grants them
 *       known:                 # known (for a spellbook caster: in the book)
 *         "3":
 *           - mage hand|xphb#c                          # fixed; #c is a cantrip
 *           - choose: level=0;1;2|class=Wizard|school=A # one pick
 *       expanded: …            # list access — `subclassCasting` reads it
 *       innate: …              # free casts — not read here
 *
 * **Several blocks are alternatives**, one of which the player takes: Circle of
 * the Land's four lands, the Genie's four kinds, the Path of the Giant's two
 * cantrips. A named block is chosen by its name; an unnamed one by its spells.
 * With one block there is nothing to choose.
 *
 * **A pick whose filter says something this module cannot test is not asked**:
 * `subschool=chronomancy` (Chronology), `components & miscellaneous=ritual`
 * reads as `ritual`, and anything else is reported as `unread`. Asking it with
 * the part we can read would offer spells the feature does not allow.
 *
 * **`innate` is not read.** Its spells own uses and resets (`daily`, `rest`),
 * which is a `feature_resource` join of its own; the species path in
 * `effectBaking.js` is the model for when it is done.
 *
 * Everything returned here is a plain value; the envelope (`source`,
 * `sourceFeatureId`) is the caller's, as in `originFeatEffects`.
 */

/** 5e.tools' one-letter school codes. */
export const SPELL_SCHOOLS = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with'])

/** "protection from evil and good" → "Protection from Evil and Good". */
function titleCase(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
}

/**
 * One fixed entry: `"mage hand|xphb#c"` → `{ name: 'Mage Hand', source: 'XPHB', cantrip: true }`.
 * Title-cased, since 5e.tools writes most names lower case; a sheet finds the
 * note by name without regard to case either way.
 */
export function spellReference(text) {
  // A homebrew note may write the tag itself: `{@spell Calm Emotions}`.
  const raw = String(text ?? '').trim().replace(/^\{@spell\s+([^}]*)\}$/i, '$1')
  const cantrip = /#c$/i.test(raw)
  const [name, source] = raw.replace(/#c$/i, '').split('|')
  return { name: titleCase(name ?? ''), source: source ? source.toUpperCase() : null, cantrip }
}

/**
 * A `choose` filter: `"level=0;1;2|class=Wizard|school=A"` →
 * `{ levels: [0,1,2], classes: ['Wizard'], schools: ['Abjuration'], ritual: false, unread: [] }`.
 * A key not named here lands in `unread`, and `additionalSpellPicks` skips the pick.
 */
export function spellFilter(text) {
  const out = { levels: null, classes: null, schools: null, ritual: false, unread: [] }
  for (const part of String(text ?? '').split('|')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim().toLowerCase()
    const values = part.slice(eq + 1).split(';').map(v => v.trim()).filter(Boolean)
    if (key === 'level') out.levels = values.map(Number).filter(Number.isInteger)
    else if (key === 'class') out.classes = values.map(v => titleCase(v.toLowerCase()))
    else if (key === 'school') out.schools = values.map(v => SPELL_SCHOOLS[v.toUpperCase()] ?? titleCase(v.toLowerCase()))
    else if (key === 'components & miscellaneous' && values.length === 1 && values[0].toLowerCase() === 'ritual') out.ritual = true
    else out.unread.push(key)
  }
  return out
}

/**
 * Whether a spell meets a pick's filter. `spell` is a catalog row as far as
 * this reads it: `{ level, classes: string[], school, ritual }`.
 */
export function spellAllowed(filter, spell) {
  if (!filter || !spell) return false
  if (filter.levels && !filter.levels.includes(Number(spell.level))) return false
  if (filter.classes) {
    const lists = new Set((spell.classes ?? []).map(c => String(c).toLowerCase()))
    if (!filter.classes.some(c => lists.has(c.toLowerCase()))) return false
  }
  if (filter.schools && !filter.schools.some(s => s.toLowerCase() === String(spell.school ?? '').toLowerCase())) return false
  if (filter.ritual && !spell.ritual) return false
  return true
}

const blocksOf = additionalSpells => (Array.isArray(additionalSpells) ? additionalSpells.filter(b => b && typeof b === 'object') : [])

/** The fixed spells a block names, in order, across every mode and level. */
function fixedNames(block) {
  const names = []
  for (const mode of ['prepared', 'known', 'innate']) {
    for (const entries of Object.values(block?.[mode] ?? {})) {
      for (const e of Array.isArray(entries) ? entries : []) if (typeof e === 'string') names.push(spellReference(e).name)
    }
  }
  return names
}

/** What the player calls an alternative: its own name, or the spells it gives. */
const blockLabel = block => (typeof block?.name === 'string' && block.name ? block.name : fixedNames(block).join(', '))

/**
 * The alternatives to choose between, or `[]` when there is only one block
 * (or none). Each is `{ name, level }`: the label stored as the answer, and the
 * first class level any of its spells arrive at, which is when the choice is
 * asked.
 */
export function additionalSpellAlternatives(additionalSpells) {
  const blocks = blocksOf(additionalSpells)
  if (blocks.length < 2) return []
  return blocks.map(b => ({ name: blockLabel(b), level: firstLevel(b) }))
}

function firstLevel(block) {
  const levels = ['prepared', 'known']
    .flatMap(mode => Object.keys(block?.[mode] ?? {}))
    .map(Number)
    .filter(Number.isInteger)
  return levels.length > 0 ? Math.min(...levels) : 1
}

/**
 * The block in play: the only one, or the alternative `chosen` names; null otherwise.
 * @param {object[]} additionalSpells
 * @param {string|null} [chosen]
 */
export function chosenAdditionalSpells(additionalSpells, chosen = null) {
  const blocks = blocksOf(additionalSpells)
  if (blocks.length === 1) return blocks[0]
  return blocks.find(b => blockLabel(b) === chosen) ?? null
}

/** Every `[level, entries]` of a mode, reached by `classLevel`, in level order. */
function reached(block, mode, classLevel) {
  return Object.entries(block?.[mode] ?? {})
    .filter(([level, entries]) => /^\d+$/.test(level) && Number(level) <= classLevel && Array.isArray(entries))
    .sort(([a], [b]) => Number(a) - Number(b))
}

/**
 * The picks a row asks at a class level: `[{ level, mode, slots: [filter, …] }]`,
 * one per class level that grants any, each slot one spell. `chosen` is the
 * alternative taken, for a row that has several; with none taken there are no
 * picks yet.
 *
 * **A spellbook holds no cantrips.** On a caster with a book (`spellbook`), a
 * `known` pick is written into it, so level 0 is left out of its filter: the
 * Savants' filters say `level=0;1;2`, and the rules say "add them to your
 * spellbook", which a cantrip never is. Offered, a Savant took an extra cantrip
 * at every odd level instead.
 * @param {object[]} additionalSpells
 * @param {number} classLevel
 * @param {string|null} [chosen]
 * @param {{ spellbook?: boolean }} [options]
 */
export function additionalSpellPicks(additionalSpells, classLevel, chosen = null, { spellbook = false } = {}) {
  const block = chosenAdditionalSpells(additionalSpells, chosen)
  if (!block) return []
  const out = []
  for (const mode of ['prepared', 'known']) {
    for (const [level, entries] of reached(block, mode, classLevel)) {
      const slots = []
      for (const e of entries) {
        const text = typeof e?.choose === 'string' ? e.choose : null
        if (!text) continue
        const read = spellFilter(text)
        if (read.unread.length > 0) continue
        const filter = mode === 'known' && spellbook && read.levels ? { ...read, levels: read.levels.filter(l => l > 0) } : read
        if (filter.levels?.length === 0) continue
        const count = Number.isInteger(e.count) && e.count > 0 ? e.count : 1
        for (let i = 0; i < count; i++) slots.push(filter)
      }
      if (slots.length > 0) out.push({ level: Number(level), mode, slots })
    }
  }
  return out.sort((a, b) => a.level - b.level || (a.mode === b.mode ? 0 : a.mode === 'prepared' ? -1 : 1))
}

/** The key one level's picks are stored under: `"6:prepared"`, `"3:known"`. */
export const pickKey = pick => `${pick.level}:${pick.mode}`

/**
 * Whether an answer covers every pick at a class level, and the alternative
 * when there are several. `answer` is `{ block, picks: { [pickKey]: [spell|null] } }`.
 * @param {object[]} additionalSpells
 * @param {number} classLevel
 * @param {{ block?: string|null, picks?: object }|null} answer
 * @param {{ spellbook?: boolean }} [options]
 */
export function additionalSpellsComplete(additionalSpells, classLevel, answer, { spellbook = false } = {}) {
  const alternatives = additionalSpellAlternatives(additionalSpells)
  const asked = alternatives.filter(a => a.level <= classLevel)
  if (asked.length > 0 && !asked.some(a => a.name === answer?.block)) return false
  return additionalSpellPicks(additionalSpells, classLevel, answer?.block ?? null, { spellbook }).every(pick => {
    const chosen = Array.isArray(answer?.picks?.[pickKey(pick)]) ? answer.picks[pickKey(pick)] : []
    return pick.slots.every((_, i) => Boolean(chosen[i]?.spellName))
  })
}

/**
 * Whether a row asks anything at a class level: an alternative, or a pick.
 * @param {object[]} additionalSpells
 * @param {number} classLevel
 * @param {string|null} [chosen]
 * @param {{ spellbook?: boolean }} [options]
 */
export function additionalSpellsAsk(additionalSpells, classLevel, chosen = null, { spellbook = false } = {}) {
  return (
    additionalSpellAlternatives(additionalSpells).some(a => a.level <= classLevel) ||
    additionalSpellPicks(additionalSpells, classLevel, chosen, { spellbook }).length > 0
  )
}

/**
 * The `spell_grant` effects a row's `additionalSpells` give at a class level.
 *
 * - A fixed `prepared` spell is `mode: 'prepared'` (a cantrip, `'cantrip'`).
 * - A fixed `known` spell is the same; the Arcane Trickster's Mage Hand is a
 *   cantrip by its `#c`.
 * - A picked spell is a cantrip at level 0, and otherwise `'prepared'` — or,
 *   for a `known` pick on a caster with a spellbook (`spellbook: true`),
 *   `'spellbook'`: the 2024 Savants write their picks into the book for free,
 *   and a book spell is prepared like any other, not always.
 *
 * `spellLevel(name, source)` may say a fixed spell's level where its entry has
 * no `#c` (Circle of the Land's Fire Bolt is written `fire bolt|xphb`). Null
 * leaves it to the `#c`.
 *
 * @param {object[]} additionalSpells the row's `data.additionalSpells`
 * @param {number} classLevel the level of the class the row belongs to
 * @param {{ block?: string|null, picks?: object, spellbook?: boolean, spellLevel?: (name: string, source: string|null) => number|null }} [options]
 * @returns {object[]}
 */
export function additionalSpellEffects(additionalSpells, classLevel, { block: chosen = null, picks = {}, spellbook = false, spellLevel = () => null } = {}) {
  const block = chosenAdditionalSpells(additionalSpells, chosen)
  if (!block) return []
  const effects = []
  for (const mode of ['prepared', 'known']) {
    for (const [, entries] of reached(block, mode, classLevel)) {
      for (const e of entries) {
        if (typeof e !== 'string') continue
        const ref = spellReference(e)
        if (!ref.name) continue
        const cantrip = ref.cantrip || spellLevel(ref.name, ref.source) === 0
        effects.push({ type: 'spell_grant', mode: cantrip ? 'cantrip' : 'prepared', spell: ref.name, spellId: null })
      }
    }
  }
  for (const pick of additionalSpellPicks(additionalSpells, classLevel, chosen, { spellbook })) {
    const answered = Array.isArray(picks?.[pickKey(pick)]) ? picks[pickKey(pick)] : []
    pick.slots.forEach((_, i) => {
      const spell = answered[i]
      if (!spell?.spellName) return
      const level = Number(spell.spellLevel)
      const mode = level === 0 ? 'cantrip' : pick.mode === 'known' && spellbook ? 'spellbook' : 'prepared'
      effects.push({ type: 'spell_grant', mode, spell: spell.spellName, spellId: spell.spellId ?? null })
    })
  }
  return effects
}
