import { itemBenefitsApply } from './itemBenefits.js'
import { activeEffectKeys, effectApplies } from './effects.js'
import { getDamageDefenses, getPayload } from './ddbDerive.js'

// Resolves the read-only Defense Grant entries surfaced on the Character
// Sheet's Defensive Profile. Grants are computed at render time and never
// stored in vault_state — they come from three sources, per CONTEXT.md:
//
// 1. DDB modifiers (DDB Characters only) — flattenModifiers + a slug lookup;
//    already encapsulated in ddbDerive.getDamageDefenses.
// 2. Baked character effects (Vault Characters) — `sheet.resolvedEffects[]`,
//    gated by `effectApplies` from `@vault/derive/effects.js`, which is the one
//    place that decides whether an activated effect is switched on. Active
//    Features (Rage, Mutagenist, Bladesong, …) declare their resistance effects
//    in content_*_feature.data.effects[] with `activation: 'activated'` — or
//    with the older `active_only: true`, which the gate still reads.
//
//    That gate used to be written out here *and* in `deriveCharacterSheet`,
//    because `sheet.resolvedEffects` is re-exported unfiltered. Two copies of a
//    rule that must agree forever is how a resistance comes to show on the
//    Defensive Profile while the same feature's AC bonus does not.
// 3. Equipped magic-item effects — `equippedItems[].magic_item.data.effects[]`,
//    treated as always-on; no `active_only` gate. Equipping is not quite enough
//    though: the campaign's active system has to have licensed the item —
//    attunement it has not got, or a loadout slot it is not worn in. That is
//    `itemBenefitsApply` below, the same seam `deriveCharacterSheet` applies to
//    these effects, so the Defensive Profile and the AC cannot disagree about
//    whether one item counts.
//
// The mapped vocabulary matches what getDamageDefenses already returns for the
// DDB side, so a Vault Character can reach every state a DDB one can:
// resistance, immunity, vulnerability and condition_immunity.
export function resolveDefenseGrants({ character, sheet, equippedItems = [], vaultState = {}, loadoutSystem = false }) {
  const grants = []

  if (character?.source === 'ddb') {
    grants.push(...getDamageDefenses(getPayload(character)))
  }

  const activeKeys = activeEffectKeys(vaultState)
  for (const e of (sheet?.resolvedEffects ?? [])) {
    if (!effectApplies(e, activeKeys)) continue
    const grant = effectToGrant(e)
    if (grant) grants.push({ ...grant, source: e.source })
  }

  for (const eq of equippedItems) {
    if (!itemBenefitsApply(eq, { loadoutSystem })) continue
    const effects = eq?.magic_item?.data?.effects ?? []
    const itemName = eq?.magic_item?.name
    for (const e of effects) {
      const grant = effectToGrant(e)
      if (grant) grants.push({ ...grant, source: itemName })
    }
  }

  return grants
}

// `condition_active` is deliberately absent: it means "currently afflicted",
// which a player sets on the panel for as long as it lasts. Nothing grants it.
const GRANTABLE_TYPES = new Set(['resistance', 'immunity', 'vulnerability', 'condition_immunity'])

function effectToGrant(e) {
  if (GRANTABLE_TYPES.has(e?.type) && e.value) {
    return { type: e.type, value: e.value }
  }
  return null
}
