/**
 * The shape of a D&D Beyond character payload — as much of it as this plugin
 * reads, and no more.
 *
 * **Every field is optional, and that is the type doing its job rather than
 * giving up.** The schema is unofficial, undocumented and state-dependent:
 * entries appear and disappear with what the character has active on D&D
 * Beyond, and whole buckets are absent on characters that have no reason to
 * carry them. A required field here would be a lie the compiler then helps us
 * tell ourselves, so the optionality is what keeps every `typeof x === 'number'`
 * check in `derive.ts` meaningful instead of looking redundant.
 *
 * Six fields below do not mean what they are called, and each says so where it
 * is declared. And `modifiers.item` is not what the character is wearing — see
 * `docs/lessons/characters.md`, "`modifiers.item` is everything she owns"
 * (MYDND-53). (This pointed at a `docs/lessons/ddb-payload.md` that never
 * existed.)
 */

/**
 * A modifier, from any bucket. `subType` names what it affects
 * (`strength-score`, `armor-class`, `initiative`, `stealth`) and `type` names
 * how (`bonus`, `set`, `proficiency`, `expertise`, `half-proficiency`).
 */
export interface DdbModifier {
  type?: string | null
  subType?: string | null
  value?: number | null
  /** Present on `unarmored-armor-class`, naming the second ability to add. */
  statId?: number | null
  /** `Light Armor`, `Thieves' Tools`, `Elvish` — the display name (MYDND-48). */
  friendlySubtypeName?: string | null
  /**
   * In the `item` bucket, the `definition.id` of the inventory item that grants
   * it (MYDND-53). **That bucket is not filtered by the item's state** — a
   * potion in the bag and an unattuned headband are listed beside what is worn
   * — so this is how a reader finds out whether the modifier is in force.
   */
  componentId?: number | null
  /** The item must be attuned, as well as equipped, for this to apply. */
  requiresAttunement?: boolean | null
}

/** An ability score row. The same shape serves base, bonus and override lists. */
export interface DdbStat {
  id?: number | null
  value?: number | null
}

export interface DdbItemDefinition {
  /** What an `item` modifier's `componentId` points at (MYDND-53). */
  id?: number | null
  name?: string | null
  /** `'Weapon'` when DDB files it cleanly. Magic weapons sometimes do not. */
  filterType?: string | null
  /** 1 = light, 2 = medium, 3 = heavy, 4 = shield. */
  armorTypeId?: number | null
  armorClass?: number | null
  damage?: { diceString?: string | null } | null
  damageType?: string | null
  /** 1 = melee, 2 = ranged. */
  attackType?: number | null
  /** 1 = simple, 2 = martial (MYDND-139). */
  categoryId?: number | null
  /** `Versatile` carries its two-handed dice in `notes`: `'1d10'`. */
  properties?: ({ name?: string | null; notes?: string | null } | null)[] | null
  /** A `+1 Longsword` carries its bonus here, not in its name. */
  grantedModifiers?: (DdbModifier | null)[] | null
  /** `'Wondrous item'`, `'Potion'`, `'Gear'` … — null on armour, so read `filterType` too. */
  type?: string | null
  /** `'Common'` on mundane gear too; only `magic` says whether it is magical. */
  rarity?: string | null
  magic?: boolean | null
  canAttune?: boolean | null
}

export interface DdbItem {
  equipped?: boolean | null
  /** **Can be 0** — a potion drunk and not yet deleted on D&D Beyond. */
  quantity?: number | null
  isAttuned?: boolean | null
  definition?: DdbItemDefinition | null
}

export interface DdbClass {
  name?: string | null
  level?: number | null
  definition?: { name?: string | null; hitDice?: number | null; canCastSpells?: boolean | null } | null
  /**
   * An Eldritch Knight's or Arcane Trickster's subclass says `canCastSpells:
   * true` and names its ability, where its class row says `false` (MYDND-139).
   */
  subclassDefinition?: { name?: string | null; canCastSpells?: boolean | null; spellCastingAbilityId?: number | null } | null
  /**
   * The class's **and its subclass's** features, each the target of the picks
   * made at it (MYDND-53). A repeat of a feature is named with its level in
   * front — `8: Ability Score Improvement`, `9: Expertise` — so strip that
   * before matching a catalog name.
   */
  classFeatures?: ({ definition?: { id?: number | null; name?: string | null; requiredLevel?: number | null } | null } | null)[] | null
}

/**
 * One choice the player made on D&D Beyond (MYDND-53). `componentId` is what it
 * was made *at* — a class feature's `definition.id` in `choices.class`, a feat's
 * in `choices.feat`. `optionValue` is an option id, resolved against
 * `choiceDefinitions[componentTypeId-type].options`, never shown raw. An
 * unresolvable one (the subclass choice, a "Choose a Feat" whose answer is the
 * feat itself) is skipped.
 */
export interface DdbChoice {
  componentId?: number | null
  componentTypeId?: number | null
  type?: number | null
  optionValue?: number | null
  label?: string | null
}

export interface DdbChoices {
  class?: (DdbChoice | null)[] | null
  feat?: (DdbChoice | null)[] | null
  /** Made at a racial trait; how a species' `__INITIAL_ASI` option is found (MYDND-110). */
  race?: (DdbChoice | null)[] | null
  choiceDefinitions?: ({ id?: string | null; options?: ({ id?: number | null; label?: string | null } | null)[] | null } | null)[] | null
}

export interface DdbAction {
  name?: string | null
  /** Non-null on a real attack. Together with `abilityModifierStatId`, the test. */
  attackTypeRange?: number | null
  abilityModifierStatId?: number | null
  /** When DDB has computed a to-hit, it overrides the sum. */
  fixedToHit?: number | null
  isProficient?: boolean | null
  dice?: { diceString?: string | null; fixedValue?: number | null } | null
  activation?: { activationType?: number | null } | null
  range?: { range?: number | null } | null
  /**
   * **Not "is an attack".** True on Sneak Attack and on every Psionic Power
   * entry, none of which involves an attack roll. Declared here only so the
   * trap is visible in the type; `isActionAttack` deliberately ignores it.
   */
  displayAsAttack?: boolean | null
  /**
   * How often it can be used (MYDND-47), measured on two real payloads
   * 2026-10-14. **`maxUses` is only the fixed part**: Bardic Inspiration ships
   * `maxUses: 0` with `statModifierUsesId: 6` — the uses are the Charisma
   * modifier — and Luck Points `maxUses: 0` with `useProficiencyBonus: true`.
   * `proficiencyBonusOperator` 1 adds the bonus, 2 multiplies `maxUses` by it.
   * `resetType` 1 is a short rest, 2 a long rest. `numberUsed` is D&D Beyond's
   * own counter and is ignored: spending is `vault-vitals`' job.
   */
  limitedUse?: {
    maxUses?: number | null
    numberUsed?: number | null
    resetType?: number | null
    statModifierUsesId?: number | null
    useProficiencyBonus?: boolean | null
    proficiencyBonusOperator?: number | null
  } | null
}

export interface DdbSpellEntry {
  definition?: { name?: string | null; level?: number | null } | null
}

/**
 * A feat the character has taken. **The name is all this plugin reads**, and the
 * reason is the most important fact about this field (MYDND-15).
 *
 * `payload.feats` is a flat array — not bucketed like `modifiers` and `spells` —
 * and `definition.name` is the only key worth anything to us, because the feat's
 * *rules* are the catalog's job. The character names its feats; `feats/` says
 * what they do. That is the whole design: one copy of a feat's effects, and a
 * feat corrected upstream is corrected everywhere by re-running the export.
 *
 * **What this field is NOT is a source of ability-score increases.** A feat's ASI
 * is already applied to the score by the time `getAbilityScore` is done with it,
 * by one of two routes, and neither of them is here:
 *
 * - as a `bonus <ability>-score` modifier in the **`feat` bucket** — measured on
 *   a real payload: `+1 charisma-score` (componentId 1789092), `+1
 *   dexterity-score` (1789159, Lightly Armored), `+1 charisma-score` (1789156),
 *   `+2 charisma-score` / `+1 dexterity-score` (1789210);
 * - or folded straight into `stats[]`, which is what a second real payload does —
 *   it names a feat called "Carouser Ability Score Improvements" and carries no
 *   ability-score modifier at all.
 *
 * So adding the catalog's own `ability_score_choice` on top **double-counts**.
 * That is why `ability_score_choice` is not in `WIRED_EFFECT_TYPES`, and the
 * reasoning is written out at that constant rather than only here.
 *
 * `componentId` is kept because it is the only thing that distinguishes two
 * modifiers that look identical, and it is how the two were traced to their feats
 * in the first place. For a feat taken at a class's Ability Score Improvement it
 * is that feature's id, which is how the Features tab shows what was taken at
 * each one (MYDND-53).
 */
export interface DdbFeat {
  definition?: { name?: string | null; id?: number | null; categories?: DdbTagged } | null
  componentId?: number | null
}

/**
 * The tags D&D Beyond hangs on a definition. `__INITIAL_ASI` marks the
 * ability score increases a character starts with, on a 2024 background's
 * "Ability Score Improvements" feat and on a species' optional "Ability Score
 * Increases" trait alike (MYDND-110).
 */
export type DdbTagged = ({ tagName?: string | null } | null)[] | null

export interface DdbPayload {
  name?: string | null
  level?: number | null
  proficiencyBonus?: number | null

  stats?: (DdbStat | null)[] | null
  bonusStats?: (DdbStat | null)[] | null
  overrideStats?: (DdbStat | null)[] | null

  /** Keyed by source (race, class, background, item, feat, condition) — not flat. */
  modifiers?: Record<string, (DdbModifier | null)[] | null> | null
  bonusModifiers?: (DdbModifier | null)[] | null
  customModifiers?: (DdbModifier | null)[] | null

  classes?: (DdbClass | null)[] | null
  race?: {
    fullName?: string | null
    /**
     * The species itself. `fullName` carries the lineage too — "Androsphinx
     * Leonine", "Mark of Passage Human" — so a catalog match reads this (MYDND-105).
     */
    baseName?: string | null
    definition?: { name?: string | null } | null
    /** Each trait's `definition.id` is what a `choices.race` row was made at. */
    racialTraits?: ({ definition?: { id?: number | null; categories?: DdbTagged } | null } | null)[] | null
    movement?: { walk?: number | null } | null
    /** Where a walking speed actually lives. `payload.speed` is absent. */
    weightSpeeds?: {
      normal?: {
        walk?: number | null
        fly?: number | null
        swim?: number | null
        climb?: number | null
        burrow?: number | null
      } | null
    } | null
  } | null

  /** The chosen background; only its name is read, to match a catalog note (MYDND-105). */
  background?: { definition?: { name?: string | null } | null } | null
  /** Experience points, carried into the vitals overlay on conversion. */
  currentXp?: number | null

  /** The hit-dice total, **excluding Constitution**. See `deriveHp`. */
  baseHitPoints?: number | null
  bonusHitPoints?: number | null
  /**
   * A maximum the player typed; already includes Constitution. Not
   * `overriddenHitPoints`, which this read until MYDND-106 (no payload has it).
   */
  overrideHitPoints?: number | null
  removedHitPoints?: number | null
  temporaryHitPoints?: number | null

  armorClass?: number | null
  overrideArmorClass?: number | null
  calculatedStats?: {
    walkSpeed?: number | null
    hitPoints?: number | null
    armorClass?: number | null
    totalArmorClass?: number | null
  } | null

  speed?: number | null
  movement?: { walk?: number | null } | null

  inventory?: (DdbItem | null)[] | null
  /** The purse. `ep` exists here and nowhere in the Vault — see `Sheet.ddb_currency`. */
  currencies?: { pp?: number | null; gp?: number | null; ep?: number | null; sp?: number | null; cp?: number | null } | null

  /** Keyed by bucket, like `modifiers`. */
  actions?: Record<string, (DdbAction | null)[] | null> | null
  customActions?: (DdbAction | null)[] | null

  classSpells?: ({ spells?: (DdbSpellEntry | null)[] | null } | null)[] | null
  spells?: Record<string, (DdbSpellEntry | null)[] | null> | null

  /** Flat, unlike `modifiers` and `spells`. See `DdbFeat` — names only. */
  feats?: (DdbFeat | null)[] | null

  /** Bucketed like `modifiers`; what each pick was made at (MYDND-53). */
  choices?: DdbChoices | null

  decorations?: { avatarUrl?: string | null } | null
}
