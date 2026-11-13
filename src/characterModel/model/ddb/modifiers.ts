import type { DdbModifier, DdbPayload, DdbTagged } from './payload'

const INITIAL_ASI = '__INITIAL_ASI'

const hasInitialAsi = (tags: DdbTagged | undefined): boolean =>
  Array.isArray(tags) && tags.some(t => t?.tagName === INITIAL_ASI)

/**
 * The components of the species' starting increases **when D&D Beyond does not
 * apply them** (MYDND-110), measured 2026-10-26 on the 25 public Disposable
 * Heroes payloads against the scores D&D Beyond's own sheet shows.
 *
 * A 2024 species carries an optional "Ability Score Increases" trait for older
 * backgrounds, tagged `__INITIAL_ASI` like a 2024 background's "Ability Score
 * Improvements" feat. A character can pick both, and then both are listed —
 * the species' in the `race` bucket under the picked option's id — but only the
 * background's are applied. Fen Moonguard read DEX 17 / CON 16 / WIS 15 for
 * D&D Beyond's 16 / 15 / 14, and Amused Flower CHA 11 for 8.
 *
 * With no background increase the species' are the only ones, and are kept: no
 * payload shows that case, and dropping a real bonus is the worse failure.
 */
function skippedSpeciesAsi(payload: DdbPayload): Set<number> {
  const out = new Set<number>()
  const feats = Array.isArray(payload?.feats) ? payload.feats : []
  if (!feats.some(f => hasInitialAsi(f?.definition?.categories))) return out

  const traits = Array.isArray(payload?.race?.racialTraits) ? payload.race.racialTraits : []
  for (const t of traits) {
    const id = t?.definition?.id
    if (typeof id === 'number' && hasInitialAsi(t?.definition?.categories)) out.add(id)
  }
  for (const c of Array.isArray(payload?.choices?.race) ? payload.choices.race : []) {
    if (typeof c?.componentId === 'number' && out.has(c.componentId) && typeof c.optionValue === 'number') {
      out.add(c.optionValue)
    }
  }
  return out
}

/**
 * `payload.modifiers`, bucket by bucket, with only the modifiers in force.
 *
 * **D&D Beyond's `item` bucket lists every item's modifiers, whatever the item
 * is doing** (MYDND-53, measured on Gabriela's payload 2026-10-14). Beside the
 * Wand of the War Mage she holds and has attuned sat the cold and force
 * resistances of two potions in her bag (`equipped: false`) and the Eyes of the
 * Eagle's Perception advantage, worn but not attuned. Read raw, the bag became
 * a resistance on the Defences tab, and an unattuned Headband of Intellect would
 * have set Intelligence to 19.
 *
 * So an item modifier is kept when an inventory row with its `componentId` is
 * equipped and — if the modifier `requiresAttunement` — attuned. Several rows
 * can share a definition (two of the same potion), and any one in force is
 * enough. A modifier that names no item, or an item not in the inventory, is
 * kept as before: nothing says it is not in force, and dropping a real bonus
 * silently is the worse failure.
 *
 * The `race` bucket drops the species' starting ability score increases when a
 * background's replace them — see `skippedSpeciesAsi`. Every other bucket —
 * class, background, feat, condition — is the character's own and passes
 * through untouched.
 */
export function modifierBuckets(payload: DdbPayload): [string, DdbModifier[]][] {
  const mods = payload?.modifiers
  if (!mods || typeof mods !== 'object' || Array.isArray(mods)) return []

  const states = new Map<number, { equipped: boolean; attuned: boolean }[]>()
  for (const item of Array.isArray(payload?.inventory) ? payload.inventory : []) {
    const id = item?.definition?.id
    if (typeof id !== 'number') continue
    const rows = states.get(id) ?? []
    rows.push({ equipped: item?.equipped === true, attuned: item?.isAttuned === true })
    states.set(id, rows)
  }

  const inForce = (m: DdbModifier): boolean => {
    const rows = typeof m.componentId === 'number' ? states.get(m.componentId) : undefined
    if (!rows) return true
    return rows.some(r => r.equipped && (!m.requiresAttunement || r.attuned))
  }

  const skipped = skippedSpeciesAsi(payload)
  const applied = (m: DdbModifier): boolean =>
    !(typeof m.componentId === 'number' && skipped.has(m.componentId) && /-score$/.test(m.subType ?? ''))

  return Object.entries(mods).map(([bucket, list]) => {
    const present = (Array.isArray(list) ? list : []).filter((m): m is DdbModifier => !!m)
    if (bucket === 'item') return [bucket, present.filter(inForce)]
    if (bucket === 'race') return [bucket, present.filter(applied)]
    return [bucket, present]
  })
}

/** Every modifier in force, from whichever bucket. */
export function activeModifiers(payload: DdbPayload): DdbModifier[] {
  return modifierBuckets(payload).flatMap(([, list]) => list)
}
