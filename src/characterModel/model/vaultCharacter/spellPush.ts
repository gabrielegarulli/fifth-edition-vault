import type { SheetSpellPush } from '../sheet/sheet'
import type { VaultCharacterJson } from './fence'
import { cantripPicks } from './spellDamage'

/**
 * What a Vault character's picks make a spell push (MYDND-179).
 *
 * Repelling Blast pushes on a hit with one cantrip, and which cantrip is the
 * pick's `target`, as for Agonizing Blast. **Read off the option's own words**
 * for the same reason: Eldritch Spear names a cantrip in exactly the same way
 * and pushes nothing. `realVault.test.ts` notices if the exporter rewords it.
 */

const PUSHES = /\bpush the creature up to (\d+) feet straight away from you\b/i

/** Every spell these picks push with, and how far. */
export function spellPushes(json: VaultCharacterJson): SheetSpellPush[] {
  const pushes = new Map<string, SheetSpellPush>()
  for (const { id, name, description } of cantripPicks(json)) {
    const feet = PUSHES.exec(description)?.[1]
    if (feet && !pushes.has(id)) pushes.set(id, { id, name, feet: Number(feet) })
  }
  return [...pushes.values()]
}
