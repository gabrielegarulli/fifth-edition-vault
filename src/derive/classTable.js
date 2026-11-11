// Readers for the 5etools `classTableGroups` shape, shared by the Core Traits
// features table and the level-progression accordions.

// Column labels arrive as either plain text or a 5etools filter tag such as
// "{@filter Prepared Spells|spells|level=!0|class=bard}".
export function cleanColLabel(label) {
  const m = label?.match(/\{@filter ([^|]+)/)
  return m ? m[1] : (label ?? '')
}

// Value of the named column at a class level, across all table groups.
// Returns null when the column doesn't exist or the cell renders as a dash.
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
export function tableVal(v) {
  if (v === undefined || v === null || v === '—') return null
  if (typeof v === 'object') {
    if (v.type === 'dice' && Array.isArray(v.toRoll)) {
      const dice = v.toRoll
        .filter(d => d?.faces)
        .map(d => `${d.number ?? 1}d${d.faces}`)
        .join(' + ')
      return dice || null
    }
    if (v.type === 'bonus' && typeof v.value === 'number') {
      return v.value >= 0 ? `+${v.value}` : String(v.value)
    }
    return v.value !== undefined ? String(v.value) : null
  }
  const s = String(v)
  return s === '0' ? null : s
}
