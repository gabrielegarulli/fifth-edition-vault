import type { SheetAbility, SheetSpellDamageBonus } from '../sheet/sheet'
import type { VaultCharacterJson } from './fence'

/**
 * What a Vault character's picks add to a spell's damage (MYDND-178).
 *
 * Agonizing Blast adds a modifier to one cantrip's damage rolls, and which cantrip
 * is the pick's `target` (MYDND-175). No effect models it: `@vault/derive` has no
 * effect naming a spell, and `invocationEffects` knows nothing of a target.
 *
 * **The rule is read off the option's own words**, as `invocationTargetKind`
 * reads an Origin feat. Eldritch Spear and Repelling Blast name a cantrip in
 * exactly the same way and add no damage, so a target alone says nothing.
 * `realVault.test.ts` is what notices if the exporter rewords it.
 */

const ADDS_A_MODIFIER =
  /\badd your (strength|dexterity|constitution|intelligence|wisdom|charisma) modifier to that spell['’]s damage rolls\b/i

interface Pick {
  description?: string | null
  target?: { kind?: string; id?: string; name?: string } | null
}

/** Every invocation pointed at a cantrip, which `spellPush.ts` reads too. */
export function* cantripPicks(json: VaultCharacterJson): Generator<{ id: string; name: string; description: string }> {
  for (const answer of Object.values(json.featureChoices ?? {})) {
    const choice = answer as { type?: string; invocations?: unknown } | null
    if (choice?.type !== 'invocations' || !Array.isArray(choice.invocations)) continue
    for (const pick of choice.invocations as Array<Pick | null>) {
      const { id, kind, name } = pick?.target ?? {}
      if (kind === 'cantrip' && id) yield { id, name: name ?? id, description: pick?.description ?? '' }
    }
  }
}

/**
 * Every spell these picks add to, with the amount.
 *
 * @param abilities the sheet's, so the number follows what the character is
 *   wearing. The overlay passes them after it has laid worn items on.
 */
export function spellDamageBonuses(
  json: VaultCharacterJson,
  abilities: readonly SheetAbility[],
): SheetSpellDamageBonus[] {
  // By id: the rule is "a different eligible cantrip", so two picks on one
  // cantrip, which only a hand edit can make, are still one bonus.
  const bonuses = new Map<string, SheetSpellDamageBonus>()
  for (const { id, name, description } of cantripPicks(json)) {
    const ability = ADDS_A_MODIFIER.exec(description)?.[1]
    if (!ability || bonuses.has(id)) continue
    const bonus = abilities.find(a => a.label === ability.slice(0, 3).toUpperCase())?.mod ?? 0
    if (bonus !== 0) bonuses.set(id, { id, name, bonus })
  }
  return [...bonuses.values()]
}
