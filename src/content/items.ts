import { bool, createCatalog, num, str, strList, type Catalog, type CatalogRow } from './catalog'
import type { ParseYaml, VaultSource } from './source'

/**
 * Mundane items and magic items. **DESIGNED SHAPES — no notes exist yet.**
 *
 * Both are modelled on their real columns so the exporter has a concrete target.
 *
 * `content_item` is `(name, source_slug, item_type, weapon_category, data jsonb,
 * cost_cp)`. Note the book column there is **`source_slug`**, not `source` —
 * `the-vault`'s own CLAUDE.md said `source` until VAULT-155 and SQL written from
 * it failed with 42703. In a note it is plain `source`, as every other type.
 *
 * `magic_item` is the widest table in the project — 26 columns. Only the ones a
 * *list* filters or sorts on go in frontmatter; the rest belong in the fence.
 * `value_cp` and `bearing_*` are included because the shop and the loadout
 * system sort on them, and sorting is a list operation.
 */

export interface ItemRow extends CatalogRow {
  itemType: string | null
  /** `simple` | `martial` for weapons; null otherwise. */
  weaponCategory: string | null
  /** Cost in copper. Integer in the DB, so integer here. */
  costCp: number | null
  tags: string[]
  /**
   * `arcane` | `druid` | `holy` — the spellcasting-focus class, `data.scfType`
   * in the web app. What answers a kit's "an arcane focus" (MYDND-31).
   */
  scfType: string | null
  /** In pounds. Frontmatter since MYDND-76, so a character's load is summed from rows. */
  weight: number | null
  /**
   * A pack's manifest, `data.packContents` in the web app, as the exporter
   * writes it: `"<quantity> <name>"` lines, because frontmatter cannot hold an
   * object. `packContentsFrom` turns it back into `{ name, quantity }`.
   */
  packContents: string[]
  /**
   * A weapon's and an armour's numbers, copied out of the fence by
   * `export:items` since MYDND-85 so the weapons table compares them from rows.
   * A vault exported before then has none, and the table draws them absent.
   */
  damage: string | null
  /** `Slashing`, as the exporter capitalises it. */
  damageType: string | null
  versatileDamage: string | null
  /** `150/600`, in feet. */
  range: string | null
  /** `Versatile`, `Finesse`, `Ammunition` — names, not codes. */
  properties: string[]
  /** `Sap`; a homebrew weapon may list two, comma-joined. */
  mastery: string | null
  ac: number | null
  /** The Strength score heavy armour asks for — a string in 5e.tools (`"13"`). */
  strength: number | null
  stealthDisadvantage: boolean
}

export interface ItemFence {
  description?: string
  damage?: string
  damage_type?: string
  properties?: string[]
  mastery?: string
  weight?: number
  [k: string]: unknown
}

export interface MagicItemRow extends CatalogRow {
  itemType: string | null
  rarity: string | null
  requiresAttunement: boolean
  attunementRestriction: string | null
  /** Value in copper, as `magic_item.value_cp` (bigint — may exceed 2^31). */
  valueCp: number | null
  /** Loadout system: the slot this occupies, and its point costs. */
  loadoutSlot: string | null
  bearingCost: number | null
  bearingBonus: number | null
  cursed: boolean
  setName: string | null
  tags: string[]
  craftComponent: string | null
  craftCreatureType: string | null
  baseItemType: string | null
  /**
   * Vault-relative path to the item's art — `magic-items/images/<slug>.webp`.
   * Written by `export:items` only when the file exists on disk (MYDND-32), so
   * a null here is "no art", not "not exported yet".
   */
  image: string | null
  /**
   * The facts the magic-items cards show (MYDND-76), all flat frontmatter that
   * `export:items` writes from 5e.tools' own fields — `magicItemFacts.ts` in
   * the MCP server. `wondrous`, `staff` and `sentient` are written only when
   * true, so an absent key is false.
   */
  wondrous: boolean
  staff: boolean
  sentient: boolean
  /** In pounds. */
  weight: number | null
  /** A count, or dice (`1d6 + 1`) for an item that rolls its charges. */
  charges: number | string | null
  /** `dawn`, `dusk`, `midnight`, `restShort`, `restLong`, `special` — or, from homebrew, an amount. */
  recharge: string | null
  rechargeAmount: string | null
  bonusAc: string | null
  bonusWeapon: string | null
  bonusSavingThrow: string | null
  bonusSpellAttack: string | null
  /** `Fireball (1 charge)`, `Mage Hand (at will)`, `Light` — see `catalog/itemShelves.ts`'s `parseCast`. */
  casts: string[]
  /** The note's first sentence, for a card with no charge, bonus or spell to show. */
  summary: string | null
}

export interface MagicItemFence {
  description?: string
  /** What crafting it consumes — `craft_component_qty`, `craft_gold`, etc. */
  craft?: Record<string, unknown>
  component?: string
  base_item?: string
  [k: string]: unknown
}

export type ItemCatalog = Catalog<ItemRow, ItemFence> & {
  ofType(itemType: string): ItemRow[]
}

export type MagicItemCatalog = Catalog<MagicItemRow, MagicItemFence> & {
  ofRarity(rarity: string): MagicItemRow[]
  /** Items that fit a loadout slot — the paper doll's query. */
  forSlot(slot: string): MagicItemRow[]
}

export function createItems(source: VaultSource, parseYaml: ParseYaml): ItemCatalog {
  const base = createCatalog<ItemRow, ItemFence>(source, parseYaml, {
    folder: 'items',
    fence: 'vault-item',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        itemType: str(fm.item_type),
        weaponCategory: str(fm.weapon_category),
        costCp: num(fm.cost_cp),
        tags: strList(fm.tags),
        scfType: str(fm.scf_type),
        weight: num(fm.weight),
        packContents: strList(fm.pack_contents),
        damage: str(fm.damage),
        damageType: str(fm.damage_type),
        versatileDamage: str(fm.versatile_damage),
        range: str(fm.range),
        properties: strList(fm.properties),
        mastery: str(fm.mastery),
        ac: num(fm.ac),
        strength: num(fm.strength),
        stealthDisadvantage: bool(fm.stealth_disadvantage),
      }
    },
  })

  return {
    ...base,
    ofType: itemType => {
      const want = itemType.trim().toLowerCase()
      return base.list().filter(i => (i.itemType ?? '').toLowerCase() === want)
    },
  }
}

export function createMagicItems(source: VaultSource, parseYaml: ParseYaml): MagicItemCatalog {
  const base = createCatalog<MagicItemRow, MagicItemFence>(source, parseYaml, {
    folder: 'magic-items',
    fence: 'vault-magic-item',
    row: note => {
      const fm = note.frontmatter
      const name = str(fm.title)
      if (!name) return null
      return {
        id: note.slug,
        path: note.path,
        name,
        source: str(fm.source),
        itemType: str(fm.item_type),
        rarity: str(fm.rarity),
        requiresAttunement: bool(fm.requires_attunement),
        attunementRestriction: str(fm.attunement_restriction),
        valueCp: num(fm.value_cp),
        loadoutSlot: str(fm.loadout_slot),
        bearingCost: num(fm.bearing_cost),
        bearingBonus: num(fm.bearing_bonus),
        cursed: bool(fm.cursed),
        setName: str(fm.set_name),
        tags: strList(fm.tags),
        craftComponent: str(fm.craft_component ?? fm.component),
        craftCreatureType: str(fm.component_creature_type ?? fm.creature_type),
        baseItemType: str(fm.base_item_type ?? fm.base_item),
        image: str(fm.image),
        wondrous: bool(fm.wondrous),
        staff: bool(fm.staff),
        sentient: bool(fm.sentient),
        weight: num(fm.weight),
        // A count stays a number; dice (`1d6 + 1`) stay text.
        charges: num(fm.charges) ?? str(fm.charges),
        recharge: str(fm.recharge),
        // `1d6 + 1`, or a bare `1` that YAML hands over as a number.
        rechargeAmount: str(fm.recharge_amount) ?? num(fm.recharge_amount)?.toString() ?? null,
        bonusAc: str(fm.bonus_ac),
        bonusWeapon: str(fm.bonus_weapon),
        bonusSavingThrow: str(fm.bonus_saving_throw),
        bonusSpellAttack: str(fm.bonus_spell_attack),
        casts: strList(fm.casts),
        summary: str(fm.summary),
      }
    },
  })

  return {
    ...base,
    ofRarity: rarity => {
      const want = rarity.trim().toLowerCase()
      return base.list().filter(i => (i.rarity ?? '').toLowerCase() === want)
    },
    forSlot: slot => {
      const want = slot.trim().toLowerCase()
      return base.list().filter(i => (i.loadoutSlot ?? '').toLowerCase() === want)
    },
  }
}

/**
 * `["1 backpack", "10 torch"]` → `[{ name: 'backpack', quantity: 1 }, …]`, the
 * shape `startingEquipment.explodeBundle` reads. The quantity always leads; a
 * line without one counts as a single item rather than being dropped.
 */
export function packContentsFrom(lines: readonly string[]): Array<{ name: string; quantity: number }> {
  return lines
    .map(line => {
      const m = /^(\d+)\s+(.+)$/.exec(line.trim())
      return m ? { name: m[2], quantity: Number(m[1]) } : { name: line.trim(), quantity: 1 }
    })
    .filter(e => e.name)
}
