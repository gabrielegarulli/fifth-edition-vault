import { monsterAc, monsterSpeeds } from './monsterStats.js'

// Wild Shape, PHB 2024.
//
// The 2014 rule swapped the Druid's hit points for the beast's, which is why
// "HP swap" sits in the backlog entry. 2024 replaced that: the Druid keeps
// their own hit points and gains temporary ones equal to their Druid level. So
// what this module answers is which forms are legal and what transforming
// grants — not how to trade one hit point pool for another.

// Maximum Challenge Rating by Druid level. The cap starts at 1/4 and widens at
// levels 4 and 8.
export function wildShapeCrCap(druidLevel) {
  if (!druidLevel || druidLevel < 2) return null
  if (druidLevel >= 8) return 1
  if (druidLevel >= 4) return 0.5
  return 0.25
}

export function formatCrCap(cap) {
  if (cap == null) return '—'
  if (cap === 0.25) return '1/4'
  if (cap === 0.5) return '1/2'
  return String(cap)
}

// Temporary hit points the transformation grants: the Druid's level in this
// class, not the character's total level.
export function wildShapeTempHp(druidLevel) {
  return druidLevel >= 2 ? druidLevel : 0
}

export function druidLevelOf(json) {
  return (json?.classes ?? []).find(c => c?.name === 'Druid')?.level ?? 0
}

// A monster row is a legal form when it is a Beast within the CR cap.
//
// Movement restrictions are not applied, and that is now a settled ruling rather
// than an open question: 2014 gated flying forms behind Druid 8 and swimming
// forms behind Druid 4, and PHB 2024 replaced both with the Max CR column alone.
// This table follows 2024, so the CR cap is the whole restriction. Do not add
// fly/swim gates back without changing this comment first.
export function isWildShapeForm(monster, crCap) {
  if (crCap == null) return false
  if ((monster?.creature_type ?? '').toLowerCase() !== 'beast') return false
  const cr = monster?.cr
  if (cr == null) return false
  return Number(cr) <= crCap
}

export function wildShapeForms(monsters, crCap) {
  return (monsters ?? [])
    .filter(m => isWildShapeForm(m, crCap))
    .sort((a, b) => (Number(a.cr) - Number(b.cr)) || a.name.localeCompare(b.name))
}

// What the sheet shows while transformed. The Druid keeps their own hit points,
// Intelligence, Wisdom and Charisma; the form supplies AC, Speed, Size and its
// own actions, which is what this pulls out of the monster payload.
export function activeFormStats(form) {
  if (!form) return null
  const data = form.data ?? {}
  // AC and Speed come out of `monsterStats` rather than being parsed here,
  // because the encounter tracker reads the same payload and the 5e.tools AC
  // shape is irregular enough that two readings of it would drift.
  //
  // `walkSpeed` is pulled out separately from the display list because the
  // sheet's Speed is a single number. A form with no walk speed at all (a
  // shark) leaves it null and the Druid's own Speed stands — see
  // `wildShapeOverrides`.
  const { speeds, walkSpeed } = monsterSpeeds(data)
  return {
    ac: monsterAc(data),
    speeds,
    walkSpeed,
    size: form.size ?? null,
    actions: data.action ?? [],
    traits: data.trait ?? [],
  }
}

// What gets written to `vault_state.wildShape`.
//
// The sheet derivation has no monster catalog — it is handed a character row and
// nothing else — so the numbers the sheet has to show while transformed travel
// with the record rather than being looked up again. `id` and `name` still
// identify the creature for the panel, which does have the catalog and uses it
// for traits and actions.
export function wildShapeFormRecord(form) {
  const stats = activeFormStats(form)
  return {
    id: form.id,
    name: form.name,
    cr: form.cr ?? null,
    size: form.size ?? null,
    ac: stats?.ac ?? null,
    walkSpeed: stats?.walkSpeed ?? null,
  }
}

// The AC and Speed a transformed Druid uses, or null when they use their own.
//
// Everything is optional on the way out: a form recorded before this carried AC
// and Speed has neither, and the honest answer there is to leave the Druid's own
// numbers alone rather than show a zero.
export function wildShapeOverrides(vaultState) {
  const form = vaultState?.wildShape
  if (!form) return null
  if (form.ac == null && form.walkSpeed == null) return null
  return { ac: form.ac ?? null, walkSpeed: form.walkSpeed ?? null }
}
