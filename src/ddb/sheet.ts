/**
 * The sheet — one plain object holding a character's derived numbers.
 *
 * It is **not** the note and **not** the payload. It is what `buildSheet`
 * produces, what gets written into a character note as YAML inside a
 * ` ```charsheet ` fence, and what the sheet page draws.
 *
 * **The fence is the sheet.** The renderer reads the fence and nothing else, so
 * hand-editing a number in a note works, and survives until the next re-sync.
 * Nothing is cached anywhere else, and there is no second copy to disagree.
 *
 * ## This is a published format
 *
 * `SHEET_VERSION` is written into every note as `vc_sheet_version`, and notes
 * carrying version 1 exist in the author's vault today, and Atlas reads these
 * notes too. So the shape below is not ours to change casually: adding an optional field is free, renaming or
 * removing one rewrites real files that no repository holds a copy of.
 *
 * The `vc_` prefix on the frontmatter keys is likewise inherited rather than
 * chosen here — see `../state/characters.ts`.
 */

export const SHEET_VERSION = 1

/** See `Sheet.feature_picks`. */
export interface SheetFeaturePick {
  /** The class the feature belongs to — a subclass's features file under it. */
  class: string
  /** The feature's name, without D&D Beyond's `8: ` level prefix. */
  feature: string
  level: number
  /** `Haste`, `Inspiring Leader (Charisma)`, `Ability Score Improvement (Charisma ×2)`. */
  picks: string[]
}

/** One ability: its score and the modifier derived from it. */
export interface SheetAbility {
  label: string
  score: number
  mod: number
}

export interface SheetSave {
  label: string
  proficient: boolean
  total: number
}

export interface SheetSkill {
  name: string
  /** The governing ability, as `STR` … `CHA`. */
  ability: string
  proficient: boolean
  expertise: boolean
  total: number
}

export interface SheetPassives {
  perception: number
  insight: number
  investigation: number
}

export interface SheetSpellcasting {
  ability: string
  mod: number
  attack: number
  dc: number
}

export interface SheetHp {
  current: number
  max: number
  temp: number
}

export interface SheetHitDie {
  label: string
  /** `13d8`. */
  formula: string
}

/**
 * Something you roll *to hit* with, whether it came from an inventory weapon or
 * from a class feature.
 *
 * Note what this is not: a feature whose dice you roll without rolling to hit
 * is a `SheetFeatureDie`, never an attack. D&D Beyond's `displayAsAttack` flag
 * does not draw that line — see `DdbAction`.
 */
export interface SheetAttack {
  name: string
  source: 'item' | 'feature'
  equipped: boolean
  /** `'melee'` / `'ranged'` for an item; `'30 ft'` or `null` for a feature. */
  range: string | null
  /** `'action'`, `'bonus action'`, `'reaction'`, or null when unmapped. */
  activation?: string | null
  attack: number
  /** `1d8+5`, or null when the payload gave no dice. */
  damage: string | null
  /**
   * Null on feature attacks on purpose. The payload carries a `damageTypeId`
   * and no lookup for it, and a wrong damage type at the table is worse than a
   * blank one.
   */
  damageType: string | null
  properties: string[]
  /**
   * How far a hit can push, for a weapon whose Push mastery this character has
   * (MYDND-179). Laid over on read, like `spell_pushes`, so never in a fence.
   */
  push?: number
}

/** A feature whose dice you roll without rolling to hit: Sneak Attack's 7d6. */
export interface SheetFeatureDie {
  name: string
  formula: string
  activation: string | null
}

export interface SheetSpellLevel {
  level: number
  spells: string[]
}

/** How far a feature makes one spell push on a hit (MYDND-179). */
export interface SheetSpellPush {
  id: string
  name: string
  feet: number
}

/**
 * A spell a feature hands over outright — "you always have X prepared"
 * (MYDND-36). `@vault/derive`'s `vaultGrantedSpells`, in the sheet's spelling.
 *
 * Not in `spells`: a granted spell counts against neither cap, and keeping it
 * out of the collection the caps measure is how the web app gets that rule.
 */
export interface SheetGrantedSpell {
  name: string
  /** The spell note's slug when the grant names one; usually it names only the spell. */
  id: string | null
  /**
   * `spellbook` (MYDND-183): a 2024 Savant's free pick, written into the book
   * rather than always prepared. The panel lists it in the book, preparable.
   */
  mode: 'prepared' | 'cantrip' | 'spellbook'
  /** The feature that grants it — the row's group heading. */
  source: string | null
}

/** A flat amount a feature adds to one spell's damage rolls (MYDND-178). */
export interface SheetSpellDamageBonus {
  id: string
  name: string
  bonus: number
}

/**
 * A spell a feature casts without a slot — Mystic Arcanum, Spell Mastery
 * (MYDND-36). `uses: null` is at will; otherwise `key` addresses the spent
 * count in the `vault-vitals` fence's `feature_uses_used`.
 */
export interface SheetFreeCast {
  key: string
  /** The feature's name, which is the group heading. */
  label: string
  name: string
  id: string | null
  level: number
  uses: number | null
  /** `long_rest`, `short_rest`, or null. */
  resets: string | null
}

/**
 * A resource the character spends and a rest gives back (MYDND-47).
 *
 * `key` addresses the spent count in `vault-vitals`' `feature_uses_used` — the
 * same map free casts use, so a long rest's reset already covers it. Built for a
 * Vault character from `@vault/derive`'s `classResourcePools`, and for a D&D
 * Beyond one from the payload's `limitedUse`; both spell the key the same way
 * (`bardic_inspiration`), so a character converted from one to the other keeps
 * its spent count.
 */
export interface SheetResource {
  key: string
  name: string
  uses: number
  /** `'short_rest'` restores all on either rest; `'long_rest'` only on a long one. */
  resets: 'short_rest' | 'long_rest' | null
  /** The die it hands out or adds, as a formula — Bardic Inspiration's `1d10`. */
  roll?: string | null
  /** A pool of points spent several at a time (Lay on Hands), not pips. */
  points?: boolean
  /** What a point is, for a points pool — `HP`. */
  unit?: string | null
  /** Uses a short rest hands back on a long-rest pool — Rage's one. */
  short_rest_regain?: number
  /** A line of rules text the row carries. */
  detail?: string | null
}

/** A defence, in the web sheet's vocabulary — `getDamageDefenses`' four types (MYDND-48). */
export interface SheetDefense {
  type: 'resistance' | 'immunity' | 'vulnerability' | 'condition_immunity'
  /** A damage type (`fire`) or a condition (`poisoned`), lowercased. */
  value: string
  /** What grants it — `Item`, `Species`, a feature's name. */
  source?: string | null
}

export interface SheetSense {
  name: string
  /** In feet. */
  range: number
  source?: string | null
}

export interface SheetProficiencies {
  armor: string[]
  weapons: string[]
  tools: string[]
  languages: string[]
}

/** One line of a D&D Beyond inventory, as `ddb_items` carries it. */
export interface SheetItem {
  name: string
  quantity: number
  /** `Wondrous item`, `Potion`, `Armor`, `Weapon`, `Gear` … */
  type: string | null
  /** Lower case; `null` on mundane gear, where D&D Beyond says `Common`. */
  rarity: string | null
  magic: boolean
  equipped: boolean
  attuned: boolean
}

export interface SheetCurrency {
  pp: number
  gp: number
  ep: number
  sp: number
  cp: number
}

export interface Sheet {
  version: number
  name: string
  /** The D&D Beyond character id, as a string. Identity lives in frontmatter. */
  ddb_id: string
  race: string | null
  /** `Rogue (Soulknife) 13`, or `—` when there are none. */
  classes: string
  level: number
  proficiency_bonus: number
  ac: number | null
  hp: SheetHp
  speed: number | null
  initiative: number
  hit_dice: SheetHitDie[]
  abilities: SheetAbility[]
  saves: SheetSave[]
  skills: SheetSkill[]
  passives: SheetPassives
  spellcasting: SheetSpellcasting | null
  attacks: SheetAttack[]
  feature_dice: SheetFeatureDie[]
  spells: SheetSpellLevel[]
  avatar: string | null
  subclasses: string[]
  /**
   * The feats the character has taken, by name (MYDND-15).
   *
   * **Names, not rules.** `resolveFeatEffects` matches each one against a feat
   * note and takes the effects from there, so this is a list of pointers into the
   * catalog rather than a model of anything. A name with no note is *reported*
   * rather than dropped — an unexported catalog and a misspelled feat look
   * identical from here and both are fixable, but only if something says so.
   *
   * An optional field, which `SHEET_VERSION`'s contract above says is the free
   * kind of change: a note written before this existed reads as having no feats,
   * which is honest, and the next re-sync fills it in.
   */
  feats?: string[]
  /**
   * What the player picked at each class or subclass feature, on D&D Beyond
   * (MYDND-53) — the two spells of Magical Discoveries, the feat taken at an
   * Ability Score Improvement, Expertise's skills. Shown under the feature on
   * the Features tab, whose text comes from the class note and so only says
   * "choose".
   *
   * Optional: a note imported before this shows no picks until its next
   * re-sync. Vault characters do not write it; their choices are the builder's.
   */
  feature_picks?: SheetFeaturePick[]

  /**
   * Spell slots per rank, `{1: 4, 2: 3}` (MYDND-36). The maximum only — what has
   * been spent is play state and lives in `vault-vitals`, for the reason hit
   * points do.
   *
   * **Written as `{}` for a character with none**, so that *absent* keeps one
   * meaning: a note projected before this field existed. For a D&D Beyond note
   * that is filled in from its classes on read (`slotTable`); a Vault character's
   * slots come from its class notes, so it needs a rebuild instead.
   *
   * In the fence, so a GM can correct a homebrew class's slots by hand — and
   * the correction survives until the next re-sync, like any other number here.
   */
  spell_slots?: Record<string, number>
  /**
   * The slot ranks a short rest refills — every rank when Pact Magic is the
   * character's only source of slots, otherwise none (`pactOnlySlotRanks`).
   * Spent slots are counted per rank, not per class, so a Warlock/Wizard's spent
   * third-rank slots cannot be told apart and none come back.
   */
  short_rest_slot_ranks?: number[]
  /** Vault characters only; see `SheetGrantedSpell`. */
  granted_spells?: SheetGrantedSpell[]
  /** Vault characters only; see `SheetFreeCast`. */
  free_cast_spells?: SheetFreeCast[]
  /**
   * Agonizing Blast on Eldritch Blast (MYDND-178). **Laid over on every read,
   * never in the fence**: the amount is a modifier a worn item can move, and an
   * older note then needs no rebuild. Vault characters only, because a D&D Beyond
   * sheet carries no invocation's target.
   */
  spell_damage_bonuses?: SheetSpellDamageBonus[]
  /** Repelling Blast on Eldritch Blast (MYDND-179). Laid over as the bonuses are. */
  spell_pushes?: SheetSpellPush[]
  /**
   * Class, species and feat resources with uses — Rage, Bardic Inspiration,
   * Luck Points (MYDND-47). Absent on a note projected before the field
   * existed, which the sheet reads as "re-sync or rebuild", never as "none".
   */
  class_resources?: SheetResource[]
  /**
   * Defences that are always on — a ring's resistance, a species' immunity
   * (MYDND-48). D&D Beyond's come from its modifiers at import. A Vault
   * character's come from `feature_effects` at render instead, because some
   * (Rage's) only count while switched on.
   */
  defenses?: SheetDefense[]
  /**
   * A Vault character's baked effects that the sheet reads at render (MYDND-48):
   * those that switch on and off (Rage) and those that grant a defence. Feat
   * effects are not here — they are resolved from `feats/` at render, as they
   * always were. So Rage's toggle, its resistances and its Strength advantage
   * work for a Vault character the way a feat's do.
   */
  feature_effects?: Record<string, unknown>[]
  /**
   * A Vault character's whole bake — every effect and the proficiency baseline
   * the projection was derived from (MYDND-57). The loadout overlay re-runs
   * `deriveCharacterSheet` with these and what is worn, so AC, the weapon lines
   * and Unarmed Strike are the web sheet's own arithmetic. Rewritten with the
   * rest of the sheet on every save and rebuild; never in the choices fence
   * (ADR 0007 §2). Absent on a note projected before it existed, which the
   * overlay reads as "rebuild", falling back to the D&D Beyond path.
   */
  vault_bake?: { effects: Record<string, unknown>[]; proficiency_baseline: unknown }
  /** Darkvision 60 ft and the like (MYDND-48). */
  senses?: SheetSense[]
  /** Every movement mode, in feet; `walk` repeats `speed` (MYDND-48). */
  speeds?: Record<string, number>
  /** What the character is trained in, by category (MYDND-48). */
  proficiencies?: SheetProficiencies
  /** Cantrips a feature adds on top of the class table's column (Thaumaturge). */
  bonus_cantrips?: number
  /** Further class lists the character prepares from — Bard Magical Secrets. */
  spell_list_classes?: string[]
  /**
   * What the character carries **on D&D Beyond** (MYDND-37) — read-only here.
   *
   * the-vault's Items tab read `json.data.inventory` straight off the stored
   * payload. The plugin keeps no payload, so the list is carried in the fence
   * instead, and like everything else in the fence it is **replaced on every
   * re-sync**: D&D Beyond owns it. What the player picks up *in the plugin* goes
   * in ` ```vault-inventory `, which a re-sync never touches, so the two never
   * have to be merged and neither can eat the other.
   *
   * Optional, so a note imported before this reads as carrying nothing on D&D
   * Beyond until its next re-sync — which is true of what the note knows.
   */
  ddb_items?: SheetItem[]
  /**
   * The D&D Beyond purse, shown beside the pouch and never added to it. The
   * pouch is the plugin's (` ```vault-inventory `), and summing the two would
   * count every coin twice the moment a player copied one across. `ep` stays
   * here because the Vault has no electrum.
   */
  ddb_currency?: SheetCurrency

  /**
   * Vault path of the portrait downloaded on import, when one was.
   *
   * Persisted into the fence, unlike `notePath`: the import sets it before the
   * note is written, and it is what makes the portrait findable again without
   * re-deriving the filename.
   */
  portrait?: string
  /**
   * The note this sheet was read out of.
   *
   * **Runtime only — never written into the fence.** It is attached after
   * reading, by the roster and by the fence renderer, so that a roll can tell
   * Atlas which note it came from. A sheet in a file that recorded its own path
   * would be wrong the moment the note were renamed.
   */
  notePath?: string
}

/**
 * The collections a re-sync tracks the size of.
 *
 * A re-sync never silently preserves what D&D Beyond no longer reports — the
 * sheet mirrors DDB, and keeping a sold weapon on it forever would be worse.
 * But the payload is state-dependent, so a shrink can equally mean the player
 * merely unmanifested something, which is why a shrink is *reported* rather
 * than treated as either an error or a non-event. See `describeSheetLosses`.
 */
export const TRACKED_COLLECTIONS = ['attacks', 'feature_dice', 'spells', 'hit_dice'] as const
