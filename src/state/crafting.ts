/**
 * Crafting, as a type only.
 *
 * Fifth Edition Vault has no crafting: its rules are not in the SRD. The state
 * layer's `State` still has the slot, always empty, so it is typed here.
 */

export type CraftMaterial = never
export type ManufactureInput = never
export type EnchantInput = never
export type CookInput = never
export type CraftResult = never
export type CraftingStore = never

export function createCrafting(): never {
  throw new Error('Fifth Edition Vault has no crafting.')
}

export function sellPriceWithQuirks(): never {
  throw new Error('Fifth Edition Vault has no crafting.')
}
