import { normalizeItemData } from '@vault/derive/itemData.js'
import { isWeaponCatalogRow } from '@vault/derive/weaponActions.js'

import type { ItemCatalog, ItemFence, MagicItemCatalog } from '../../../compendium'
import {
  hydrateRow,
  type CharacterInventory,
  type HydratedRow,
  type InventoryCatalogs,
  type ItemCatalogLookupInfo,
  type MagicItemCatalogLookupInfo,
} from '../inventory'

/**
 * What a character is wearing, in the shape `@vault/derive` reads (MYDND-57).
 *
 * The web sheet hands `deriveCharacterSheet` its equipped inventory rows with the
 * catalog rows joined on — `content_item.data` carrying the dice, properties and
 * armour class, `magic_item.data.effects` the enchantment. Until MYDND-57 the
 * plugin never had that data at all: an item row's facts live in its note's
 * ` ```vault-item ` fence, which only an async `detail()` reads, so the loadout
 * overlay worked from a hand-written table of weapon names instead.
 *
 * `preloadCatalogs` does the reading once, up front, so the overlay itself stays
 * synchronous — the state layer's AC write runs inside `vault.write`'s sync
 * transform. Every caller of `projectSheetWithInventory` can afford the await
 * first: the roster and the state layer are async already, and the fence
 * renderer draws one tick later.
 */

export type EquippedRow = HydratedRow

/** An item note and its fence data, found by id and then by name. */
export interface ItemDataSource {
  item(key: string): Promise<ItemCatalogLookupInfo | null>
  magicItem(key: string): Promise<MagicItemCatalogLookupInfo | null>
}

/**
 * A ` ```vault-item ` fence as `normalizeItemData`'s input.
 *
 * The exporter flattens the web app's `data` into scalar keys — `damage: 1d8`,
 * `damage_type: Slashing`, `versatile_damage: 1d10`, `range: 150/600` — where
 * `content_item.data` nests `damage: { dice, type }`. `normalizeItemData` reads
 * the legacy 5e.tools spellings (`dmg1`, `dmgType`, `dmg2`) as well as the
 * canonical one, so the fence is handed over under those names and the library
 * does the rest: the property slugs, the mastery slug, the range.
 */
export function itemDataFromFence(fence: ItemFence | null | undefined): Record<string, unknown> {
  if (!fence) return {}
  return normalizeItemData({
    dmg1: fence.damage,
    dmgType: fence.damage_type,
    dmg2: fence.versatile_damage,
    range: fence.range,
    properties: fence.properties,
    mastery: fence.mastery,
    ac: fence.ac,
    strength: fence.strength,
    stealth: fence.stealth_disadvantage,
    weight: fence.weight,
    effects: fence.effects,
  })
}

/** The source over the content layer's two item catalogs. */
export function itemDataSource(content: { items: ItemCatalog; magicItems: MagicItemCatalog }): ItemDataSource {
  return {
    async item(key) {
      const row = content.items.byId(key) ?? content.items.byName(key)
      if (!row) return null
      const fence = (await content.items.detail(row.id))?.fence ?? null
      return {
        id: row.id,
        name: row.name,
        itemType: row.itemType,
        weaponCategory: row.weaponCategory,
        costCp: row.costCp,
        data: itemDataFromFence(fence),
      }
    },
    async magicItem(key) {
      const row = content.magicItems.byId(key) ?? content.magicItems.byName(key)
      if (!row) return null
      const fence = ((await content.magicItems.detail(row.id))?.fence ?? null)
      const own = Array.isArray(fence?.effects) ? (fence.effects as unknown[]) : []
      const effects = [...own, ...statedSpellAttack(row.bonusSpellAttack, own)]
      return {
        id: row.id,
        name: row.name,
        itemType: row.itemType,
        rarity: row.rarity,
        requiresAttunement: row.requiresAttunement,
        bearingCost: row.bearingCost,
        bearingBonus: row.bearingBonus,
        cursed: row.cursed,
        loadoutSlot: row.loadoutSlot,
        setName: row.setName,
        data: { effects },
      }
    },
  }
}

/**
 * A note's `bonus_spell_attack: "+3"` as the `spell_attack_bonus` it states
 * (MYDND-117), unless the fence carries one already.
 *
 * `export:items` writes 5e.tools' `bonusSpellAttack` as flat frontmatter for the
 * cards and no effect into the fence, so a worn Wand of the War Mage reached
 * `deriveCharacterSheet` with nothing to add. It is read here rather than in
 * `withStatedEnchantment` because this is where the frontmatter is to hand; it
 * is an ordinary item effect all the same, gated on attunement by
 * `itemBenefitsApply`.
 */
export function statedSpellAttack(bonus: string | null | undefined, own: readonly unknown[]): Array<Record<string, unknown>> {
  const amount = Number(bonus)
  if (!bonus || !Number.isInteger(amount) || amount === 0) return []
  if (own.some(e => (e as { type?: unknown } | null)?.type === 'spell_attack_bonus')) return []
  return [{ type: 'spell_attack_bonus', amount }]
}

const ARMOR_TYPES = new Set(['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield'])

/**
 * Enchantments the notes do not carry yet, stated as the effects they are.
 *
 * the-vault writes a magic weapon's `+1` into `magic_item.data.effects` from its
 * description (`scripts/gen_magic_item_effects.mjs`, VAULT-218/233), but the
 * magic-item notes are exported without those, so here every enchantment would
 * read as `+0`. (The one effect the exporter does write is a set score,
 * `ability_score_set`, since MYDND-108.) Two rules stand in, both stated rather
 * than guessed:
 *
 * - **A `+N` in the name of a magic weapon, armour or shield is that bonus** —
 *   the DMG names them so ("Weapon, +1"). A weapon gets `+N` to attack and damage;
 *   armour and a shield get `+N` AC.
 * - **Ring and Cloak of Protection are `+1` AC,** by exact id. The substring test
 *   this replaces gave +1 to anything named "protection" or "warding".
 *
 * Both are ordinary item effects, so `itemBenefitsApply` still gates them on
 * attunement. Effects the note does carry win: none is added twice.
 */
const PROTECTION_ITEMS = new Set(['ring-of-protection', 'cloak-of-protection'])

export function withStatedEnchantment(row: EquippedRow): EquippedRow {
  const magic = row.magic_item
  if (!magic) return row
  const own = Array.isArray(magic.data?.effects) ? (magic.data.effects as Array<{ type?: string }>) : []
  const base = row.base_content_item ?? magic.base_item ?? null
  const added: Array<Record<string, unknown>> = []

  const plus = /\+(\d)\b/.exec(magic.name ?? '')
  if (plus) {
    const n = Number(plus[1])
    if (isWeaponCatalogRow(magic, base ?? undefined)) {
      if (!own.some(e => e?.type === 'weapon_attack_bonus')) added.push({ type: 'weapon_attack_bonus', amount: n })
      if (!own.some(e => e?.type === 'weapon_damage_bonus')) added.push({ type: 'weapon_damage_bonus', amount: n })
    } else if (ARMOR_TYPES.has(base?.item_type ?? '') || /armou?r|shield/i.test(magic.item_type ?? '')) {
      if (!own.some(e => e?.type === 'ac_bonus')) added.push({ type: 'ac_bonus', amount: n })
    }
  }
  if (PROTECTION_ITEMS.has(magic.id ?? '') && !own.some(e => e?.type === 'ac_bonus')) {
    added.push({ type: 'ac_bonus', amount: 1 })
  }
  if (added.length === 0) return row
  return { ...row, magic_item: { ...magic, data: { ...magic.data, effects: [...own, ...added] } } }
}

/** A row is worn when it is slotted, or — without the loadout system — equipped. */
const isWorn = (it: { loadout_slot?: string | null; equipped?: boolean }) =>
  Boolean(it.loadout_slot) || Boolean(it.equipped)

const ARMOR_BASE = new Set(['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield'])

/**
 * Magic armour is armour. `vaultAc` and `vaultArmorState` look for the armour on
 * `content_item` alone, and a magic row carries its base on `base_content_item`
 * instead, so a Breastplate of Command would not count as worn. Only armour and
 * shields are moved across: a magic *weapon* must keep `content_item` empty, or
 * `resolveWeaponData` would read the plain base and drop the enchantment.
 */
function asWornArmor(row: EquippedRow): EquippedRow {
  const base = row.base_content_item ?? row.magic_item?.base_item ?? null
  if (row.content_item || !row.magic_item || !base || !ARMOR_BASE.has(base.item_type ?? '')) return row
  return { ...row, content_item: { ...base, name: row.magic_item.name ?? base.name } }
}

/**
 * The catalogs `hydrateRow` reads, with every listed item's note data loaded.
 * Each note is read once however many rows name it. `fallback` answers what no
 * note does — the UI's frontmatter-only lookup, so a row keeps its name.
 */
export async function preloadCatalogs(
  items: ReadonlyArray<{ content_item_id?: string | null; base_content_item_id?: string | null; magic_item_id?: string | null }>,
  source: ItemDataSource | null | undefined,
  fallback?: InventoryCatalogs,
): Promise<InventoryCatalogs> {
  const plain = new Map<string, ItemCatalogLookupInfo | null>()
  const magic = new Map<string, MagicItemCatalogLookupInfo | null>()
  if (source) {
    for (const it of items) {
      for (const key of [it.content_item_id, it.base_content_item_id]) {
        if (key && !plain.has(key)) plain.set(key, await source.item(key))
      }
      if (it.magic_item_id && !magic.has(it.magic_item_id)) magic.set(it.magic_item_id, await source.magicItem(it.magic_item_id))
    }
  }
  return {
    items: {
      byId: key => plain.get(key) ?? fallback?.items?.byId(key) ?? fallback?.items?.byName?.(key) ?? null,
    },
    magicItems: {
      byId: key => magic.get(key) ?? fallback?.magicItems?.byId(key) ?? fallback?.magicItems?.byName?.(key) ?? null,
    },
  }
}

/** Every worn row, hydrated, in the shape `@vault/derive` reads. */
export function equippedRows(inv: CharacterInventory, catalogs?: InventoryCatalogs): EquippedRow[] {
  return inv.items.filter(isWorn).map(it => asWornArmor(withStatedEnchantment(hydrateRow(it, catalogs))))
}
