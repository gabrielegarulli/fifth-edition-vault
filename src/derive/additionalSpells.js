// @ts-check
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
 *       expanded: …            # list access — `expandedSpellAccess` reads it
 *       innate: …              # free casts — not read here
 *
 * **Several blocks are alternatives**, one of which the player takes: Circle of
 * the Land's four lands, the Genie's four kinds, the Path of the Giant's two
 * cantrips. A named block is chosen by its name; an unnamed one by its spells.
 * With one block there is nothing to choose.
 *
 * **A pick whose filter says something this module cannot test is not asked**:
 * `components & miscellaneous=ritual` reads as `ritual`, `subschool=chronomancy`
 * against the spell note's `subschools` (MYDND-285), and anything else is
 * reported as `unread`. Asking it with
 * the part we can read would offer spells the feature does not allow.
 *
 * **`innate` is read by `innateSpellEffects`** (MYDND-283): each spell is a
 * `spell_grant`, and a free cast that recharges is a `feature_resource` beside
 * it — the pair `speciesSpellEffects` emits for a species.
 *
 * Everything returned here is a plain value; the envelope (`source`,
 * `sourceFeatureId`) is the caller's, as in `originFeatEffects`.
 */

/**
 * One block of `additionalSpells`: each mode maps a class level to its
 * entries, as 5e.tools writes them. Read off a note, so nothing in it is
 * promised.
 *
 * @typedef {{ name?: unknown, prepared?: unknown, known?: unknown, innate?: unknown, [mode: string]: unknown }} AdditionalSpellsBlock
 */
/**
 * A `choose` filter, read.
 *
 * @typedef {{ levels: number[] | null, classes: string[] | null, schools: string[] | null, subschools: string[] | null, ritual: boolean, unread: string[] }} SpellFilter
 */
/** @typedef {'prepared' | 'known'} PickMode */
/** @typedef {{ level: number, mode: PickMode, slots: SpellFilter[] }} SpellPick */
/** @typedef {{ name: string, level: number }} Alternative */
/**
 * What an `expanded` list adds to a class's list (MYDND-285): the spells it
 * names, lowercased, and the filters it opens.
 *
 * @typedef {{ names: string[], filters: SpellFilter[] }} ExpandedAccess
 */
/**
 * One picked spell, as the answer stores it.
 *
 * @typedef {{ spellName?: string | null, spellLevel?: unknown, spellId?: string | null }} PickedSpell
 */
/**
 * The answer: the alternative taken, and the spells picked, by `pickKey`.
 *
 * @typedef {{ block?: string | null, picks?: Readonly<Record<string, unknown>> | null }} AdditionalSpellsAnswer
 */
/**
 * @typedef {{ type: 'spell_grant', mode: 'cantrip' | 'prepared' | 'spellbook', spell: string, spellId: string | null }} SpellGrantEffect
 */

/** @type {readonly PickMode[]} */
const PICK_MODES = ['prepared', 'known']

/** 5e.tools' one-letter school codes. */
/** @type {Readonly<Record<string, string>>} */
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

/**
 * "protection from evil and good" → "Protection from Evil and Good".
 *
 * @param {string} name
 * @returns {string}
 */
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
 *
 * @param {unknown} text
 * @returns {{ name: string, source: string | null, cantrip: boolean }}
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
 * `{ levels: [0,1,2], classes: ['Wizard'], schools: ['Abjuration'], subschools: null, ritual: false, unread: [] }`.
 * A key not named here lands in `unread`, and `additionalSpellPicks` skips the pick.
 *
 * @param {unknown} text
 * @returns {SpellFilter}
 */
export function spellFilter(text) {
  /** @type {SpellFilter} */
  const out = { levels: null, classes: null, schools: null, subschools: null, ritual: false, unread: [] }
  for (const part of String(text ?? '').split('|')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq).trim().toLowerCase()
    const values = part.slice(eq + 1).split(';').map(v => v.trim()).filter(Boolean)
    if (key === 'level') out.levels = values.map(Number).filter(Number.isInteger)
    else if (key === 'class') out.classes = values.map(v => titleCase(v.toLowerCase()))
    else if (key === 'school') out.schools = values.map(v => SPELL_SCHOOLS[v.toUpperCase()] ?? titleCase(v.toLowerCase()))
    else if (key === 'subschool') out.subschools = values.map(v => v.toLowerCase())
    else if (key === 'components & miscellaneous' && values.length === 1 && values[0].toLowerCase() === 'ritual') out.ritual = true
    else out.unread.push(key)
  }
  return out
}

/**
 * Whether a spell meets a pick's filter. `spell` is a catalog row as far as
 * this reads it: `{ level, classes: string[], school, subschools: string[], ritual }`.
 *
 * @param {Pick<SpellFilter, 'levels' | 'classes' | 'schools' | 'ritual'> & Partial<Pick<SpellFilter, 'subschools'>> | null | undefined} filter
 * @param {{ level?: unknown, classes?: readonly unknown[] | null, school?: unknown, subschools?: readonly unknown[] | null, ritual?: unknown } | null | undefined} spell
 * @returns {boolean}
 */
export function spellAllowed(filter, spell) {
  if (!filter || !spell) return false
  if (filter.levels && !filter.levels.includes(Number(spell.level))) return false
  if (filter.classes) {
    const lists = new Set((spell.classes ?? []).map(c => String(c).toLowerCase()))
    if (!filter.classes.some(c => lists.has(c.toLowerCase()))) return false
  }
  if (filter.schools && !filter.schools.some(s => s.toLowerCase() === String(spell.school ?? '').toLowerCase())) return false
  if (filter.subschools) {
    const subs = new Set((spell.subschools ?? []).map(c => String(c).toLowerCase()))
    if (!filter.subschools.some(c => subs.has(c))) return false
  }
  if (filter.ritual && !spell.ritual) return false
  return true
}

/**
 * @param {unknown} additionalSpells
 * @returns {AdditionalSpellsBlock[]}
 */
const blocksOf = additionalSpells =>
  Array.isArray(additionalSpells)
    ? /** @type {unknown[]} */ (additionalSpells).filter(/** @returns {b is AdditionalSpellsBlock} */ b => !!b && typeof b === 'object')
    : []

/**
 * One mode of a block, level → entries. Trusted to be an object, as before.
 *
 * @param {AdditionalSpellsBlock | null | undefined} block
 * @param {string} mode
 * @returns {Readonly<Record<string, unknown>>}
 */
const modeOf = (block, mode) => /** @type {Readonly<Record<string, unknown>>} */ (block?.[mode] ?? {})

/**
 * The fixed spells a block names, in order, across every mode and level.
 *
 * @param {AdditionalSpellsBlock | null | undefined} block
 * @returns {string[]}
 */
function fixedNames(block) {
  /** @type {string[]} */
  const names = []
  for (const mode of ['prepared', 'known', 'innate']) {
    for (const entries of Object.values(modeOf(block, mode))) {
      for (const e of Array.isArray(entries) ? entries : []) if (typeof e === 'string') names.push(spellReference(e).name)
    }
  }
  return names
}

/**
 * What the player calls an alternative: its own name, or the spells it gives.
 *
 * @param {AdditionalSpellsBlock | null | undefined} block
 * @returns {string}
 */
const blockLabel = block => (typeof block?.name === 'string' && block.name ? block.name : fixedNames(block).join(', '))

/**
 * The alternatives to choose between, or `[]` when there is only one block
 * (or none). Each is `{ name, level }`: the label stored as the answer, and the
 * first class level any of its spells arrive at, which is when the choice is
 * asked.
 *
 * @param {unknown} additionalSpells
 * @returns {Alternative[]}
 */
export function additionalSpellAlternatives(additionalSpells) {
  const blocks = blocksOf(additionalSpells)
  if (blocks.length < 2) return []
  return blocks.map(b => ({ name: blockLabel(b), level: firstLevel(b) }))
}

/**
 * @param {AdditionalSpellsBlock} block
 * @returns {number}
 */
function firstLevel(block) {
  // `innate` counts too: Path of the Giant's two alternatives are innate only,
  // and its cantrip arrives at 3. Its `_` key is no level and is skipped.
  const levels = [...PICK_MODES, 'innate']
    .flatMap(mode => Object.keys(modeOf(block, mode)))
    .map(Number)
    .filter(Number.isInteger)
  return levels.length > 0 ? Math.min(...levels) : 1
}

/**
 * The block in play: the only one, or the alternative `chosen` names; null otherwise.
 * @param {unknown} additionalSpells
 * @param {string|null} [chosen]
 * @returns {AdditionalSpellsBlock | null}
 */
export function chosenAdditionalSpells(additionalSpells, chosen = null) {
  const blocks = blocksOf(additionalSpells)
  if (blocks.length === 1) return blocks[0]
  return blocks.find(b => blockLabel(b) === chosen) ?? null
}

/**
 * Every `[level, entries]` of a mode, reached by `classLevel`, in level order.
 *
 * @param {AdditionalSpellsBlock} block
 * @param {PickMode} mode
 * @param {number} classLevel
 * @returns {[string, unknown[]][]}
 */
function reached(block, mode, classLevel) {
  return Object.entries(modeOf(block, mode))
    .filter(/** @returns {pair is [string, unknown[]]} */ pair => /^\d+$/.test(pair[0]) && Number(pair[0]) <= classLevel && Array.isArray(pair[1]))
    .sort(([a], [b]) => Number(a) - Number(b))
}

/**
 * What a row's `expanded` lists add to the class's spell list at `classLevel`
 * (MYDND-285). Two keys, as 5e.tools writes them:
 *
 * - `s1`…`s9`: a spell level. The 2014 patrons' tables (`s1: [burning hands,
 *   command]`), reached once the caster can cast that level, `maxSpellLevel`.
 * - `"3"`: a class level. Its entries are names or `{ all: <filter> }`, the
 *   Eldritch Knight's `level=1|class=Wizard` and Divine Soul's Cleric list.
 *
 * **Alternatives**: the chosen block's lists; with none chosen, what every
 * block shares, so a Genie is offered its four kinds' common spells and a
 * Divine Soul (whose Good and Evil lists are the same) its whole list.
 *
 * A filter this module cannot read is left out, as `additionalSpellPicks`
 * leaves its pick out.
 *
 * @param {unknown} additionalSpells
 * @param {number} classLevel
 * @param {number} maxSpellLevel
 * @param {string|null} [chosen]
 * @returns {ExpandedAccess}
 */
export function expandedSpellAccess(additionalSpells, classLevel, maxSpellLevel, chosen = null) {
  const blocks = blocksOf(additionalSpells)
  const picked = chosenAdditionalSpells(additionalSpells, chosen)
  const lists = (picked ? [picked] : blocks).map(b => expandedOf(b, classLevel, maxSpellLevel))
  if (lists.length === 0) return { names: [], filters: [] }
  const [first, ...rest] = lists
  const names = first.names.filter(n => rest.every(l => l.names.includes(n)))
  const filters = first.filters.filter(t => rest.every(l => l.filters.includes(t)))
  return {
    names: [...new Set(names)],
    filters: [...new Set(filters)].map(spellFilter).filter(f => f.unread.length === 0),
  }
}

/**
 * One block's reached `expanded` entries: names lowercased, filters as written.
 *
 * @param {AdditionalSpellsBlock} block
 * @param {number} classLevel
 * @param {number} maxSpellLevel
 * @returns {{ names: string[], filters: string[] }}
 */
function expandedOf(block, classLevel, maxSpellLevel) {
  /** @type {{ names: string[], filters: string[] }} */
  const out = { names: [], filters: [] }
  for (const [key, entries] of Object.entries(modeOf(block, 'expanded'))) {
    const spellLevel = /^s([0-9])$/i.exec(key)
    const reachedKey = spellLevel ? Number(spellLevel[1]) <= maxSpellLevel : /^[0-9]+$/.test(key) && Number(key) <= classLevel
    if (!reachedKey || !Array.isArray(entries)) continue
    for (const e of /** @type {unknown[]} */ (entries)) {
      // A note on the spell is not its name: the Lithic's "shield (appears as
      // a stone barrier)".
      if (typeof e === 'string') out.names.push(spellReference(e.replace(/\s*\([^)]*\)\s*$/, '')).name.toLowerCase())
      else {
        const all = /** @type {{ all?: unknown } | null} */ (e)?.all
        if (typeof all === 'string') out.filters.push(all)
      }
    }
  }
  return out
}

/**
 * Whether a spell is on an `expanded` list: named on it, or meeting a filter.
 *
 * @param {ExpandedAccess | null | undefined} access
 * @param {Parameters<typeof spellAllowed>[1] & { name?: unknown }} spell
 * @returns {boolean}
 */
export function expandedAllows(access, spell) {
  if (!access || !spell) return false
  if (access.names.includes(String(spell.name ?? '').toLowerCase())) return true
  return access.filters.some(f => spellAllowed(f, spell))
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
 * @param {unknown} additionalSpells
 * @param {number} classLevel
 * @param {string|null} [chosen]
 * @param {{ spellbook?: boolean }} [options]
 * @returns {SpellPick[]}
 */
export function additionalSpellPicks(additionalSpells, classLevel, chosen = null, { spellbook = false } = {}) {
  const block = chosenAdditionalSpells(additionalSpells, chosen)
  if (!block) return []
  /** @type {SpellPick[]} */
  const out = []
  for (const mode of PICK_MODES) {
    for (const [level, entries] of reached(block, mode, classLevel)) {
      /** @type {SpellFilter[]} */
      const slots = []
      for (const raw of entries) {
        // A pick is `{ choose, count? }`; anything else here is a fixed spell.
        const e = /** @type {{ choose?: unknown, count?: unknown } | null | undefined} */ (raw)
        const text = typeof e?.choose === 'string' ? e.choose : null
        if (!text) continue
        const read = spellFilter(text)
        if (read.unread.length > 0) continue
        const filter = mode === 'known' && spellbook && read.levels ? { ...read, levels: read.levels.filter(l => l > 0) } : read
        if (filter.levels?.length === 0) continue
        const count = typeof e?.count === 'number' && Number.isInteger(e.count) && e.count > 0 ? e.count : 1
        for (let i = 0; i < count; i++) slots.push(filter)
      }
      if (slots.length > 0) out.push({ level: Number(level), mode, slots })
    }
  }
  return out.sort((a, b) => a.level - b.level || (a.mode === b.mode ? 0 : a.mode === 'prepared' ? -1 : 1))
}

/**
 * The key one level's picks are stored under: `"6:prepared"`, `"3:known"`.
 *
 * @param {{ level: number, mode: string }} pick
 * @returns {string}
 */
export const pickKey = pick => `${pick.level}:${pick.mode}`

/**
 * Whether an answer covers every pick at a class level, and the alternative
 * when there are several. `answer` is `{ block, picks: { [pickKey]: [spell|null] } }`.
 * @param {unknown} additionalSpells
 * @param {number} classLevel
 * @param {AdditionalSpellsAnswer | null | undefined} answer
 * @param {{ spellbook?: boolean }} [options]
 * @returns {boolean}
 */
export function additionalSpellsComplete(additionalSpells, classLevel, answer, { spellbook = false } = {}) {
  const alternatives = additionalSpellAlternatives(additionalSpells)
  const asked = alternatives.filter(a => a.level <= classLevel)
  if (asked.length > 0 && !asked.some(a => a.name === answer?.block)) return false
  return additionalSpellPicks(additionalSpells, classLevel, answer?.block ?? null, { spellbook }).every(pick => {
    const stored = answer?.picks?.[pickKey(pick)]
    const chosen = Array.isArray(stored) ? /** @type {readonly (PickedSpell | null | undefined)[]} */ (stored) : []
    return pick.slots.every((_, i) => Boolean(chosen[i]?.spellName))
  })
}

/**
 * Whether a row asks anything at a class level: an alternative, or a pick.
 * @param {unknown} additionalSpells
 * @param {number} classLevel
 * @param {string|null} [chosen]
 * @param {{ spellbook?: boolean }} [options]
 * @returns {boolean}
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
 * @param {unknown} additionalSpells the row's `data.additionalSpells`
 * @param {number} classLevel the level of the class the row belongs to
 * @param {{ block?: string|null, picks?: Readonly<Record<string, unknown>> | null, spellbook?: boolean, spellLevel?: (name: string, source: string|null) => number|null }} [options]
 * @returns {SpellGrantEffect[]}
 */
export function additionalSpellEffects(additionalSpells, classLevel, { block: chosen = null, picks = {}, spellbook = false, spellLevel = () => null } = {}) {
  const block = chosenAdditionalSpells(additionalSpells, chosen)
  if (!block) return []
  /** @type {SpellGrantEffect[]} */
  const effects = []
  for (const mode of PICK_MODES) {
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
    const stored = picks?.[pickKey(pick)]
    const answered = Array.isArray(stored) ? /** @type {readonly (PickedSpell | null | undefined)[]} */ (stored) : []
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

/**
 * @typedef {{ kind: 'ability_modifier', ability: string, min: number }} AbilityUses
 */
/**
 * An innate grant's effects: the spell, and its free cast when it recharges.
 *
 * @typedef {{ type: 'spell_grant', mode: 'cantrip' | 'prepared', spell: string, spellId: null, detail?: string }
 *   | { type: 'feature_resource', key: string, name: string, uses: number | AbilityUses, resets: 'long_rest' | 'short_rest', detail: string }} InnateEffect
 */
/**
 * One innate entry, read: the spells, and how they are cast.
 *
 * @typedef {{ spells: { name: string, source: string | null, cantrip: boolean }[], cast: 'will' | 'daily' | 'rest' | 'ritual' | 'resource', count: string | null }} InnateEntry
 */

const ABILITIES = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha'])

/** @type {readonly string[]} */
const CASTS = ['will', 'daily', 'rest', 'ritual', 'resource']

/** @param {string} s */
const keySlug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/**
 * The fixed spells of one list; a `choose` entry is not read here.
 *
 * @param {unknown} list
 */
const fixedSpells = list =>
  (Array.isArray(list) ? /** @type {unknown[]} */ (list) : [])
    .filter(/** @returns {e is string} */ e => typeof e === 'string')
    .map(e => spellReference(e))
    .filter(ref => ref.name)

/**
 * One level's `innate` value, as entries. A list is at will; an object maps a
 * cast (`daily`, `rest`, `will`, `ritual`, `resource`) to its spells: a list,
 * or an object keyed by a count (`1`, `1e`: one each) or an ability (`cha`).
 *
 * @param {unknown} value
 * @returns {InnateEntry[]}
 */
function innateEntries(value) {
  if (Array.isArray(value)) return [{ spells: fixedSpells(value), cast: 'will', count: null }]
  if (!value || typeof value !== 'object') return []
  /** @type {InnateEntry[]} */
  const out = []
  for (const [key, inner] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
    if (!CASTS.includes(key)) continue
    const cast = /** @type {InnateEntry['cast']} */ (key)
    if (Array.isArray(inner)) {
      out.push({ spells: fixedSpells(inner), cast, count: null })
      continue
    }
    if (!inner || typeof inner !== 'object') continue
    for (const [count, list] of Object.entries(/** @type {Record<string, unknown>} */ (inner))) {
      out.push({ spells: fixedSpells(list), cast, count })
    }
  }
  return out
}

/**
 * The spells an owner's features already give a free cast of: a feature that
 * authors a `feature_resource` and whose description names the spell. Steps of
 * the Fey is a pool for Misty Step, authored with its own uses and detail, and
 * the innate `daily: cha` beside it would be a second pool for the same casts.
 *
 * @param {readonly ({ description?: unknown, data?: { effects?: unknown } | null } | null | undefined)[] | null | undefined} features
 * @returns {(spell: string) => boolean}
 */
export function authoredFreeCasts(features) {
  const texts = (features ?? [])
    .filter(f => {
      const effects = f?.data?.effects
      return Array.isArray(effects) && /** @type {unknown[]} */ (effects).some(e => /** @type {{ type?: unknown } | null} */ (e)?.type === 'feature_resource')
    })
    .map(f => String(f?.description ?? '').toLowerCase())
  return spell => {
    const name = spell.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[^a-z])${name}([^a-z]|$)`)
    return texts.some(t => re.test(t))
  }
}

/**
 * The effects a row's `additionalSpells.innate` gives at a class level
 * (MYDND-283): the pair `speciesSpellEffects` emits for a species.
 *
 * - Every spell is a `spell_grant`, `prepared` (a cantrip, `cantrip`): the
 *   sheet lists it with its save DC whether or not the cast is free.
 * - `daily` is a pool that resets on a long rest, `rest` one that resets on a
 *   short rest. Its count is uses (`1`, `2`); `1e` is one use of each spell,
 *   and a plain count over several spells is one shared pool; an ability
 *   (`cha`) is that modifier, at least one.
 * - `will` and a plain list are at will: the spell, no pool. `ritual` is a
 *   spell cast only as a ritual, and `resource` one that costs the feature's
 *   own points (`resourceName`); both say so in the grant's detail.
 * - `_` is the first level the row is had at, so it is always reached.
 *
 * `owned(spell)` says a feature already authors the free cast
 * (`authoredFreeCasts`): the spell is still granted, and no pool is added.
 * `owner` names the pools: "Misty Step (Archfey Patron)".
 *
 * @param {unknown} additionalSpells the row's `data.additionalSpells`
 * @param {number} classLevel
 * @param {{ block?: string | null, owner?: string, owned?: (spell: string) => boolean, spellLevel?: (name: string, source: string | null) => number | null }} [options]
 * @returns {InnateEffect[]}
 */
export function innateSpellEffects(additionalSpells, classLevel, { block: chosen = null, owner = 'Subclass', owned = () => false, spellLevel = () => null } = {}) {
  const block = chosenAdditionalSpells(additionalSpells, chosen)
  if (!block) return []
  const resourceName = typeof block.resourceName === 'string' && block.resourceName ? block.resourceName : 'resource'
  /** @param {string} level */
  const order = level => (level === '_' ? 0 : Number(level))
  const levels = Object.entries(modeOf(block, 'innate'))
    .filter(([level]) => level === '_' || (/^\d+$/.test(level) && Number(level) <= classLevel))
    .sort(([a], [b]) => order(a) - order(b))

  /** @type {InnateEffect[]} */
  const effects = []
  const granted = new Set()
  for (const [, value] of levels) {
    for (const entry of innateEntries(value)) {
      const cost = entry.count ?? '1'
      const detail = entry.cast === 'ritual'
        ? 'Cast only as a Ritual'
        : entry.cast === 'resource' ? `Costs ${cost} ${resourceName}${cost === '1' ? '' : 's'}` : null
      for (const ref of entry.spells) {
        if (granted.has(ref.name.toLowerCase())) continue
        granted.add(ref.name.toLowerCase())
        const cantrip = ref.cantrip || spellLevel(ref.name, ref.source) === 0
        effects.push({ type: 'spell_grant', mode: cantrip ? 'cantrip' : 'prepared', spell: ref.name, spellId: null, ...(detail ? { detail } : {}) })
      }
      if (entry.cast !== 'daily' && entry.cast !== 'rest') continue
      const spells = entry.spells.filter(ref => !owned(ref.name))
      if (spells.length === 0) continue
      const count = cost.toLowerCase()
      /** @type {number | AbilityUses | null} */
      const uses = ABILITIES.has(count)
        ? { kind: 'ability_modifier', ability: count, min: 1 }
        : /^\d+e?$/.test(count) ? parseInt(count, 10) : null
      if (uses === null || uses === 0) continue
      /** @type {'long_rest' | 'short_rest'} */
      const resets = entry.cast === 'rest' ? 'short_rest' : 'long_rest'
      // `1e` is a pool per spell; a plain count over several is one between them.
      const pools = count.endsWith('e') || spells.length === 1 ? spells.map(ref => [ref]) : [spells]
      for (const pool of pools) {
        const names = pool.map(ref => ref.name)
        effects.push({
          type: 'feature_resource',
          key: `innate_${keySlug(owner)}_${keySlug(names.join('_'))}`,
          name: `${names.join(' or ')} (${owner})`,
          uses,
          resets,
          detail: 'Cast without a spell slot',
        })
      }
    }
  }
  return effects
}
