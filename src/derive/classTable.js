// @ts-check
// Readers for the 5etools `classTableGroups` shape, shared by the Core Traits
// features table and the level-progression accordions.

/**
 * One of 5etools' `classTableGroups`: column labels and a row per class level.
 *
 * @typedef {{ colLabels?: readonly string[] | null, rows?: (unknown[] | null | undefined)[] | null }} ClassTableGroup
 */
/** @typedef {{ data?: { classTableGroups?: readonly ClassTableGroup[] | null } | null }} ClassTableHolder */

// Column labels arrive as either plain text or a 5etools filter tag such as
// "{@filter Prepared Spells|spells|level=!0|class=bard}".
/**
 * @param {string | null | undefined} label
 * @returns {string}
 */
export function cleanColLabel(label) {
  const m = label?.match(/\{@filter ([^|]+)/)
  return m ? m[1] : (label ?? '')
}

// Value of the named column at a class level, across all table groups.
// Returns null when the column doesn't exist or the cell renders as a dash.
/**
 * @param {ClassTableHolder | null | undefined} classData
 * @param {string} colLabel
 * @param {number} level
 * @returns {string | null}
 */
export function tableColumnAtLevel(classData, colLabel, level) {
  for (const group of classData?.data?.classTableGroups ?? []) {
    if (!Array.isArray(group.rows)) continue
    const ci = (group.colLabels ?? []).findIndex(
      l => cleanColLabel(l).trim().toLowerCase() === colLabel.toLowerCase()
    )
    if (ci < 0) continue
    return tableVal(group.rows[level - 1]?.[ci])
  }
  return null
}

// Eldritch Invocation slots at a class level. The 2024 Warlock's column is
// `Invocations`; the 2014 Warlock's is `Invocations Known` (VAULT-243), the
// same split `readKnownCap` already handles for `Cantrips` / `Cantrips Known`.
// 0 when the class has no such column or the cell is a dash.
/**
 * @param {ClassTableHolder | null | undefined} classData
 * @param {number} level
 * @returns {number}
 */
export function invocationsAtLevel(classData, level) {
  const v = tableColumnAtLevel(classData, 'Invocations', level)
    ?? tableColumnAtLevel(classData, 'Invocations Known', level)
  const n = v ? parseInt(v, 10) : 0
  return isNaN(n) ? 0 : n
}

// A cell is a scalar, a `{value}` wrapper, a `{type: 'dice', toRoll}` bundle —
// the last of which carries columns like Rogue Sneak Attack, Bard Bardic Die and
// Monk Martial Arts — or a `{type: 'bonus', value}`, which is a signed number
// (Barbarian Rage Damage) and renders as "+2" rather than a bare "2".
// Returns null for cells that should render as a dash.
/**
 * @param {unknown} v
 * @returns {string | null}
 */
export function tableVal(v) {
  if (v === undefined || v === null || v === '—') return null
  if (typeof v === 'object') {
    const cell = /** @type {{ type?: unknown, toRoll?: unknown, value?: unknown }} */ (v)
    if (cell.type === 'dice' && Array.isArray(cell.toRoll)) {
      /** @type {readonly ({ number?: number | null, faces?: number | null } | null)[]} */
      const rolls = cell.toRoll
      const dice = rolls
        .filter(d => d?.faces)
        .map(d => `${d?.number ?? 1}d${d?.faces}`)
        .join(' + ')
      return dice || null
    }
    if (cell.type === 'bonus' && typeof cell.value === 'number') {
      return cell.value >= 0 ? `+${cell.value}` : String(cell.value)
    }
    return cell.value !== undefined ? String(cell.value) : null
  }
  const s = String(v)
  return s === '0' ? null : s
}

/**
 * A subclass's own dice pool, as a `feature_resource` with a `die`.
 *
 * @typedef {{ type: 'feature_resource', name: string, uses: number, die: number, resets: 'long_rest' | 'short_rest', shortRestRegain?: number, detail?: string, key?: string, source?: string, sourceFeatureId?: string }} DicePoolEffect
 */
/**
 * A feature row as `subclassDicePool` reads it.
 *
 * @typedef {{ id?: string | null, name?: string | null, description?: unknown }} DiceFeature
 */

/** "{@tip Die Size|Psionic Energy Die Size}" → "Die Size"; plain text as it is. */
/** @param {unknown} label */
const tipText = label => {
  const s = String(label ?? '')
  const m = s.match(/\{@tip ([^|}]+)/)
  return (m ? m[1] : s).trim()
}

/**
 * A subclass's dice pool at a class level (MYDND-283), read off its
 * `subclassTableGroups`: the group whose columns are Die Size and Number
 * (Psi Warrior and Soulknife's Psionic Energy Dice, the Couatl Herald's Mercy
 * Dice). Null without such a group, or before the dice arrive.
 *
 * The table gives the size and the count; the feature that introduces the dice
 * ("It is represented by your Psionic Energy Dice") gives the name, the reset
 * and the envelope. "Regain all … when you finish a Short or Long Rest" is a
 * short-rest pool; anything else resets on a long rest, and "regain one … Short
 * Rest" says so in the detail. With no such feature, the column's own tip names
 * it ("Soulknife Energy Die Size" → "Soulknife Energy Dice").
 *
 * @param {{ subclassTableGroups?: unknown } | null | undefined} data the subclass's `data`
 * @param {readonly (DiceFeature | null | undefined)[] | null | undefined} features its feature rows up to the level
 * @param {number} classLevel
 * @returns {DicePoolEffect | null}
 */
export function subclassDicePool(data, features, classLevel) {
  const groups = Array.isArray(data?.subclassTableGroups) ? /** @type {unknown[]} */ (data.subclassTableGroups) : []
  for (const raw of groups) {
    const group = /** @type {{ colLabels?: unknown, rows?: unknown } | null} */ (raw)
    const labels = Array.isArray(group?.colLabels) ? /** @type {unknown[]} */ (group.colLabels) : []
    const sizeAt = labels.findIndex(l => tipText(l).toLowerCase() === 'die size')
    const countAt = labels.findIndex(l => tipText(l).toLowerCase() === 'number')
    if (sizeAt < 0 || countAt < 0) continue
    const rows = Array.isArray(group?.rows) ? /** @type {unknown[]} */ (group.rows) : []
    const row = rows[classLevel - 1]
    if (!Array.isArray(row)) return null
    const cells = /** @type {unknown[]} */ (row)
    const die = Number(String(tableVal(cells[sizeAt]) ?? '').match(/d(\d+)/i)?.[1] ?? 0)
    const uses = Number(tableVal(cells[countAt]) ?? 0)
    if (!Number.isInteger(die) || die <= 0 || !Number.isInteger(uses) || uses <= 0) return null

    /** @param {DiceFeature | null | undefined} f */
    const named = f => String(f?.description ?? '').match(/represented by your ((?:[A-Z][\w'-]* )+Dice)\b/)?.[1] ?? null
    const feature = (features ?? []).find(f => named(f)) ?? null
    const tip = String(labels[sizeAt] ?? '').match(/\{@tip [^|}]+\|([^}]+)\}/)?.[1]?.trim() ?? ''
    const name = (feature && named(feature)) ?? (/ Die Size$/i.test(tip) ? tip.replace(/ Die Size$/i, ' Dice') : 'Dice')
    const text = String(feature?.description ?? '')
    const resets = /regain all [^.]*when you finish a Short or Long Rest/i.test(text) ? 'short_rest' : 'long_rest'
    const regainOne = resets === 'long_rest' && /regain one [^.]*Short Rest/i.test(text)

    /** @type {DicePoolEffect} */
    const pool = { type: 'feature_resource', name, uses, die, resets }
    if (regainOne) {
      pool.shortRestRegain = 1
      pool.detail = 'Regain one die on a Short Rest'
    }
    if (feature?.id) {
      pool.sourceFeatureId = feature.id
      if (feature.name) pool.source = feature.name
    } else {
      pool.key = `dice_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
    }
    return pool
  }
  return null
}

/**
 * The effects with `pool` in them. A pool the subclass already authors, on the
 * same feature or by the same name, takes the table's count and die and keeps
 * everything else it says (its key, so spent dice stay spent, and its reset
 * and detail), gaining the table feature's short-rest regain if it states none.
 * Otherwise the pool is added.
 *
 * @template {{ type?: string | null, name?: string | null, sourceFeatureId?: string | null, shortRestRegain?: unknown }} E
 * @param {readonly E[]} effects
 * @param {DicePoolEffect | null} pool
 * @returns {(E | DicePoolEffect)[]}
 */
export function withDicePool(effects, pool) {
  if (!pool) return [...effects]
  const lower = pool.name.toLowerCase()
  const byName = effects.findIndex(e => e?.type === 'feature_resource' && String(e.name ?? '').toLowerCase() === lower)
  const at = byName >= 0
    ? byName
    : effects.findIndex(e => e?.type === 'feature_resource' && Boolean(pool.sourceFeatureId) && e.sourceFeatureId === pool.sourceFeatureId)
  if (at < 0) return [...effects, pool]
  const regain = pool.shortRestRegain ? { shortRestRegain: pool.shortRestRegain } : {}
  return effects.map((e, i) => (i === at ? { ...regain, ...e, uses: pool.uses, die: pool.die } : e))
}
