import { abilityMod } from './dnd5e.js'

// Reading the numbers off a `content_monster` payload.
//
// The 5e.tools shape these were imported from is inconsistent in ways that
// matter: AC is sometimes a bare number, sometimes an array, sometimes an array
// of objects carrying the source of the armour. Wild Shape and the encounter
// tracker both need these, and getting the shape wrong shows a blank stat
// rather than failing, so the rule is stated once here.

export function monsterAc(data) {
  const entry = Array.isArray(data?.ac) ? data.ac[0] : data?.ac
  if (typeof entry === 'number') return entry
  return entry?.ac ?? null
}

// `hp.average` is the number a GM runs the monster on; `hp.formula` is there to
// roll it instead, which the tracker offers.
export function monsterHp(data) {
  const hp = data?.hp
  if (typeof hp === 'number') return hp
  return hp?.average ?? null
}

export function monsterHpFormula(data) {
  return data?.hp?.formula ?? null
}

// Ability scores on a monster payload are scores, not modifiers.
export function monsterDexMod(data) {
  const dex = data?.dex
  return typeof dex === 'number' ? abilityMod(dex) : 0
}

// Speeds, as display strings plus the walk speed as a number — the same split
// the character sheet needs, since the sheet's Speed is one number and the
// panel's is a list.
export function monsterSpeeds(data) {
  const entries = Object.entries(data?.speed ?? {})
    .filter(([, v]) => typeof v === 'number' || typeof v?.number === 'number')
    .map(([key, v]) => [key, typeof v === 'number' ? v : v.number])
  const walk = entries.find(([key]) => key === 'walk')
  return {
    speeds: entries.map(([key, n]) => `${key} ${n} ft.`),
    walkSpeed: walk ? walk[1] : null,
  }
}
