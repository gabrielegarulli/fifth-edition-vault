// @ts-check
// The derived character sheet: everything a character's choices and effects
// add up to, and its class resource pools.

import {
  STAT_IDS,
  ABILITY_SLUGS,
  abilityBlock,
  deriveAc,
  deriveHp,
  formatClasses,
  getAbilityModifier,
  getAbilityScore,
  getAvatarUrl,
  getBackdropUrl,
  getClasses,
  getInitiative,
  getInventory,
  getName,
  getPassives,
  getPayload,
  getRace,
  getSaves,
  getSenses,
  getSkills,
  getSpeed,
  getTempHitPoints,
  hasClass,
  proficiencyBonus,
  totalCharacterLevel,
  ddbSpellBonusEffects,
} from './ddbDerive.js'
import {
  VAULT_ABILITY_FULL,
  vaultAvatarUrl,
  vaultBackdropUrl,
  vaultRace,
  vaultFormatClasses,
  vaultAbilityScores,
  vaultHp,
  vaultAc,
  vaultArmorState,
  vaultInitiative,
  vaultSpeed,
  vaultSaves,
  vaultSkills,
  vaultPassives,
  vaultPb,
  vaultTotalLevel,
  vaultName,
  vaultAbilityChecks,
  vaultAttackRolls,
  vaultCritRange,
  vaultFeatureResources,
  vaultSpeeds,
  vaultToolProficiencies,
  vaultActionSurge,
  vaultArcaneRecovery,
  vaultBardicInspiration,
  vaultBonusCantrips,
  vaultChannelDivinity,
  vaultClassLevel,
  vaultDeflectAttacks,
  vaultDivineIntervention,
  vaultFavoredEnemy,
  vaultFeatureOptions,
  vaultFreeCastSpells,
  vaultGrantedSpells,
  vaultIndomitable,
  vaultInvocations,
  vaultLayOnHands,
  vaultMetamagic,
  vaultMonkFocus,
  vaultNaturesVeil,
  vaultPaladinChannelDivinity,
  vaultPaladinFreeCasts,
  vaultArmorPenaltyEffects,
  vaultRage,
  vaultRageDamageEffects,
  vaultSecondWind,
  vaultSenses,
  vaultSneakAttack,
  vaultSorceryPoints,
  vaultSorcerousRestoration,
  vaultSpellListAccess,
  vaultTireless,
  vaultInnateSorcery,
  vaultUncannyMetabolism,
  vaultWildShape,
} from './vaultDerive.js'
import { itemBenefitsApply } from './itemBenefits.js'
import { activeEffectKeys, applicableEffects } from './effects.js'
import { wildShapeOverrides } from './wildShape.js'
import { deriveWeaponActions } from './weaponActions.js'
import { resolveProficiencies, unproficientArmor } from './proficiency.js'
import { deriveUnarmedStrike } from './unarmedStrike.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./loadout.js').LoadoutRow} LoadoutRow */
/** @typedef {import('./ddbDerive.js').DdbRow} DdbRow */
/** @typedef {import('./vaultDerive.js').FeatureResource} FeatureResource */
/**
 * The character's `vault_state`, as far as the sheet reads it: hit points
 * written over the source's, the switched-on benefits, a Wild Shape form, and
 * a GM's proficiency overrides.
 *
 * @typedef {NonNullable<Parameters<typeof activeEffectKeys>[0]>
 *   & NonNullable<Parameters<typeof wildShapeOverrides>[0]>
 *   & {
 *     hp?: { current?: unknown, maxBonus?: number | null, tempHp?: number | null } | null,
 *     proficiencyOverrides?: NonNullable<Parameters<typeof resolveProficiencies>[0]>['overrides'],
 *   }} SheetVaultState
 */
/**
 * A character row. `json` is a Vault character's json when `source` is
 * `'vault'`, and a D&D Beyond row's otherwise.
 *
 * @typedef {{ source?: string | null, json?: unknown, vault_state?: SheetVaultState | null }} SheetCharacter
 */
/**
 * The resource fields of a derived sheet, as `classResourcePools` reads them.
 *
 * @typedef {{
 *   rage?: FeatureResource | null,
 *   favoredEnemy?: FeatureResource | null,
 *   tireless?: FeatureResource | null,
 *   naturesVeil?: FeatureResource | null,
 *   bardicInspiration?: FeatureResource | null,
 *   monkFocus?: FeatureResource | null,
 *   uncannyMetabolism?: FeatureResource | null,
 *   wildShape?: FeatureResource | null,
 *   arcaneRecovery?: FeatureResource | null,
 *   channelDivinity?: FeatureResource | null,
 *   divineIntervention?: FeatureResource | null,
 *   secondWind?: FeatureResource | null,
 *   actionSurge?: FeatureResource | null,
 *   indomitable?: FeatureResource | null,
 *   layOnHands?: FeatureResource | null,
 *   paladinChannelDivinity?: FeatureResource | null,
 *   paladinFreeCasts?: readonly FeatureResource[] | null,
 *   sorceryPoints?: FeatureResource | null,
 *   innateSorcery?: FeatureResource | null,
 *   sorcerousRestoration?: FeatureResource | null,
 *   featureResources?: readonly FeatureResource[] | null,
 *   sneakAttack?: unknown,
 *   deflectAttacks?: unknown,
 * }} ResourceSheet
 */

const LABEL_TO_KEY = { STR: 'str', DEX: 'dex', CON: 'con', INT: 'int', WIS: 'wis', CHA: 'cha' }

/** @type {Readonly<Record<string, string>>} */
const SKILL_ABILITY = {
  'acrobatics': 'dex', 'animal-handling': 'wis', 'arcana': 'int',
  'athletics': 'str', 'deception': 'cha', 'history': 'int',
  'insight': 'wis', 'intimidation': 'cha', 'investigation': 'int',
  'medicine': 'wis', 'nature': 'int', 'perception': 'wis',
  'performance': 'cha', 'persuasion': 'cha', 'religion': 'int',
  'sleight-of-hand': 'dex', 'stealth': 'dex', 'survival': 'wis',
}

// A transformed Druid uses the beast's AC and Speed, so the sheet's own badge
// and Speed have to yield to them — before this, the badge kept reading the
// Druid's armour and the Wild Shape panel carried a note telling the player to
// ignore it. Hit points are deliberately *not* here: PHB 2024 keeps the Druid's
// own, which is the whole reason this feature needed no HP swap.
//
// Applied at the seam rather than inside `vaultAc`/`vaultSpeed` so those two
// stay answers about the Druid's own body, the way `applyHpOverrides` keeps
// `vaultHp` an answer about the Druid's own hit dice.
/**
 * @template {{ ac: number | null, speed: number | null }} T
 * @param {T} derived
 * @param {SheetCharacter} character
 */
function applyWildShape(derived, character) {
  const form = wildShapeOverrides(character.vault_state)
  if (!form) return derived
  return {
    ...derived,
    ac: form.ac ?? derived.ac,
    speed: form.walkSpeed ?? derived.speed,
    wildShaped: true,
  }
}

// `derived.tempHp` is what the source reports — only D&D Beyond reports any
// (VAULT-257) — and yields to `vault_state` as soon as the sheet has written one.
/**
 * @param {{ current: number, max: number, tempHp?: number | null }} derived
 * @param {SheetCharacter} character
 * @returns {{ current: number, max: number, tempHp: number, maxBonus: number }}
 */
function applyHpOverrides(derived, character) {
  const vs = character.vault_state?.hp ?? {}
  return {
    current: typeof vs.current === 'number' ? vs.current : derived.current,
    max: derived.max + (vs.maxBonus ?? 0),
    tempHp: vs.tempHp ?? derived.tempHp ?? 0,
    maxBonus: vs.maxBonus ?? 0,
  }
}

// Every class resource that is a *pool* — something with a `key`, a number of
// `uses` and a `resets`. One list, because three things need it and they must
// agree: the Class Resources panel renders it, the Short Rest works out what to
// refill from it, and hasClassResources decides whether the block appears at all.
/**
 * @param {ResourceSheet | null | undefined} sheet
 * @returns {FeatureResource[]}
 */
export function classResourcePools(sheet) {
  return [
    sheet?.rage,
    sheet?.favoredEnemy, sheet?.tireless, sheet?.naturesVeil,
    sheet?.bardicInspiration, sheet?.monkFocus, sheet?.uncannyMetabolism,
    sheet?.wildShape, sheet?.arcaneRecovery,
    sheet?.channelDivinity, sheet?.divineIntervention,
    sheet?.secondWind, sheet?.actionSurge, sheet?.indomitable,
    sheet?.layOnHands, sheet?.paladinChannelDivinity, ...(sheet?.paladinFreeCasts ?? []),
    sheet?.sorceryPoints, sheet?.innateSorcery, sheet?.sorcerousRestoration,
    // Feat-granted pools (Ruling 1). **This spread is load-bearing.**
    // `shortRestPlan()` derives entirely from this list, so a feat resource in a
    // parallel list would render its pips, count its spends, and then silently
    // never come back on a short rest — the one way this feature can be
    // half-wired and still look right.
    ...(sheet?.featureResources ?? []),
  ].filter(/** @returns {r is FeatureResource} */ r => Boolean(r))
}

// True when the sheet carries at least one class-resource field, so callers can
// decide whether to render the Class Resources block and its divider. Sneak
// Attack and Deflect Attacks are rationed by the turn rather than by a pool, so
// they belong to the block without being pools.
/**
 * @param {ResourceSheet | null | undefined} sheet
 * @returns {boolean}
 */
export function hasClassResources(sheet) {
  return classResourcePools(sheet).length > 0
    || !!sheet?.sneakAttack || !!sheet?.deflectAttacks
}

/**
 * @param {SheetCharacter | null | undefined} character
 * @param {readonly LoadoutRow[]} [equippedItems]
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem] the campaign's `loadout_system` toggle,
 *   which chooses whether a magic item is licensed by attunement or by the slot
 *   it is worn in. Defaults to false — the attunement path, unchanged.
 */
export function deriveCharacterSheet(character, equippedItems = [], opts = {}) {
  if (!character) return null

  if (character.source === 'vault') {
    // The keys the sheet reads off the json itself; `vaultDerive` reads the rest.
    const json = /** @type {{
      resolvedEffects?: readonly Effect[] | null,
      proficiencyBaseline?: NonNullable<Parameters<typeof resolveProficiencies>[0]>['baseline'],
      originFeat?: unknown,
      feats?: readonly unknown[] | null,
      classes?: readonly { name?: string | null }[] | null,
      size?: string | null,
    }} */ (character.json ?? {})
    const resolvedEffects = json.resolvedEffects ?? []
    // Every toggle the character has switched on, under both the per-benefit
    // keys this release introduces and the per-feature ones every live character
    // still carries. `vaultRageDamageEffects` wants the same set.
    const activeFeatureIds = activeEffectKeys(character.vault_state)

    // Baked effects from feats/features/race, gated by `effects.js` — the one
    // place that decides whether an effect applies. This used to be an
    // `active_only` test written out here and a second copy of it in
    // `defenseGrants.js`, because `resolvedEffects` is re-exported below
    // unfiltered and every consumer had to re-derive the filter for itself.
    const bakedEffects = applicableEffects(resolvedEffects, activeFeatureIds)
    // Runtime effects from equipped magic items. An item the campaign's active
    // system has not licensed contributes nothing — attunement it has not got,
    // or a loadout slot it is not worn in. `itemBenefitsApply` is the single
    // place that choice is made, and it gates the Effects rather than the item,
    // so unattuned magic armour is still armour.
    const itemEffects = equippedItems.filter(item => itemBenefitsApply(item, opts)).flatMap(item =>
      (/** @type {{ effects?: readonly Effect[] | null } | null | undefined} */ (item.magic_item?.data)?.effects ?? [])
        .map(e => ({ ...e, source: item.magic_item?.name ?? 'item' }))
    )
    // Rage's damage bonus obeys the same toggle as its resistances but scales
    // with Barbarian level, so it cannot be a static Effect on the content row
    // and is synthesised from the level instead.
    const rageEffects = vaultRageDamageEffects(character, resolvedEffects, activeFeatureIds)

    // VAULT-102. Reads the *gated* effect list, so a proficiency granted by a
    // toggled-off benefit is not counted — and the baked baseline, which carries
    // the one thing an effect list cannot say: that something is unknown.
    //
    // **It moved up here in VAULT-154 and the order is now load-bearing.** The
    // armour penalty joins `allEffects` (which is what lets `vaultSaves` and
    // `vaultAbilityChecks` apply it without either learning a new concept), and
    // it is derived *from* this proficiency set — so the set must be resolved
    // against the pre-penalty list. Feeding it `allEffects` after the fact would
    // be a loop, and a penalty that fed its own input would be worse than a
    // crash: it would simply be wrong on the second read.
    //
    // Nothing in the penalty grants a proficiency, so the pre-penalty list is
    // the complete answer and no second pass is owed.
    const proficiency = resolveProficiencies({
      baseline: json.proficiencyBaseline,
      effects: [...bakedEffects, ...itemEffects, ...rageEffects],
      overrides: character.vault_state?.proficiencyOverrides,
    })
    const unproficientArmorItems = unproficientArmor(proficiency, equippedItems)
    const armorPenaltyEffects = vaultArmorPenaltyEffects(unproficientArmorItems)
    // `{ active, source }` for the two per-row consumers. Read off the effects
    // just built rather than rebuilt from the item list, so the marker on an
    // attack row and the marker on a save can never name different armour.
    const armorPenalty = armorPenaltyEffects.length > 0
      ? { active: true, source: armorPenaltyEffects[0].source }
      : null

    const allEffects = [...bakedEffects, ...itemEffects, ...rageEffects, ...armorPenaltyEffects]

    const abs = vaultAbilityScores(character, allEffects)
    const dexMod = abs.find(a => a.key === 'dex')?.mod ?? 0
    const conMod = abs.find(a => a.key === 'con')?.mod ?? 0
    const wisMod = abs.find(a => a.key === 'wis')?.mod ?? 0

    const abilityScores = abs.map(a => ({
      ...a,
      fullName: VAULT_ABILITY_FULL[a.key],
      rollAbility: a.key,
    }))

    const saves = vaultSaves(character, allEffects).map(s => ({
      ...s,
      rollAbility: s.key,
    }))

    const skills = vaultSkills(character, allEffects).map(s => ({
      ...s,
      rollAbility: s.ability,
    }))

    const feats = [
      ...(json.originFeat ? [json.originFeat] : []),
      ...(json.feats ?? []),
    ]

    const { isWearingArmor, isWearingHeavyArmor, hasShield, shieldBonus } = vaultArmorState(equippedItems)
    const classes = (json.classes ?? []).map(c => c.name)

    return applyWildShape({
      name: vaultName(character),
      avatarUrl: vaultAvatarUrl(character),
      backdropUrl: vaultBackdropUrl(character),
      race: vaultRace(character),
      classes: vaultFormatClasses(character),
      totalLevel: vaultTotalLevel(character),

      abilityScores,
      hp: applyHpOverrides(vaultHp(character, allEffects), character),
      ac: vaultAc(character, equippedItems, allEffects),
      initiative: vaultInitiative(character, allEffects),
      // The loadout goes in because Unarmored Movement is switched off by armor
      // or a Shield, the same condition the Martial Arts die rides — and because
      // Barbarian Fast Movement keys on Heavy armor specifically.
      speed: vaultSpeed(character, allEffects, { isWearingArmor, hasShield, isWearingHeavyArmor }),
      pb: vaultPb(character),
      // Chosen at creation for the ten species offering Small or Medium, and
      // fixed by the species otherwise. Null on a character built before
      // VAULT-170, which is why every reader treats it as optional.
      size: json.size ?? null,

      saves,
      skills,
      passives: vaultPassives(character, allEffects),
      senses: vaultSenses(allEffects),
      // Ability *checks* are their own line, kept out of `abilityScores` so a
      // bonus to raw Strength checks cannot leak into attacks, saves or skills.
      abilityChecks: vaultAbilityChecks(character, allEffects),
      attackRolls: vaultAttackRolls(allEffects),
      critRange: vaultCritRange(allEffects),
      toolProficiencies: vaultToolProficiencies(allEffects),
      // Every movement mode, where `speed` above is the walking number alone.
      speeds: vaultSpeeds(character, allEffects, { isWearingArmor, hasShield, isWearingHeavyArmor }),

      feats,
      resolvedEffects,
      // Ruling 12's offers, **already gated** — `resolvedEffects` above is
      // re-exported unfiltered and every consumer has to gate for itself, and
      // `DiceRollerProvider` is the worst possible place to re-derive that rule:
      // it is global, it has no character, and a switched-off benefit rewriting
      // a die face is a bug nobody would spot. Narrow on purpose rather than
      // exporting the whole gated list, which would be a second array next to
      // `resolvedEffects` that differs from it invisibly.
      diceInterventions: allEffects.filter(e => e?.type === 'dice_intervention'),
      // VAULT-195's two spell bonuses, **already gated**, for the same reason
      // and in the same shape as `diceInterventions` above. Narrow rather than
      // folded to a number here, because a `spell_save_dc_bonus` may name the
      // classes it reaches and this function does not know the character's
      // casting abilities — those come from `content_class` rows the Spell Panel
      // fetches. So the list travels and `spellcasting.js` does the per-class
      // fold, which keeps the class predicate in exactly one place.
      spellBonusEffects: allEffects.filter(
        e => e?.type === 'spell_attack_bonus' || e?.type === 'spell_save_dc_bonus',
      ),
      featureResources: vaultFeatureResources(character, allEffects),
      rage: vaultRage(character),
      favoredEnemy: vaultFavoredEnemy(character),
      tireless: vaultTireless(character, allEffects),
      naturesVeil: vaultNaturesVeil(character, allEffects),
      bardicInspiration: vaultBardicInspiration(character, allEffects),
      monkFocus: vaultMonkFocus(character),
      uncannyMetabolism: vaultUncannyMetabolism(character),
      deflectAttacks: vaultDeflectAttacks(character, allEffects),
      wildShape: vaultWildShape(character),
      sneakAttack: vaultSneakAttack(character),
      arcaneRecovery: vaultArcaneRecovery(character),
      channelDivinity: vaultChannelDivinity(character),
      divineIntervention: vaultDivineIntervention(character),
      secondWind: vaultSecondWind(character),
      actionSurge: vaultActionSurge(character),
      indomitable: vaultIndomitable(character),
      layOnHands: vaultLayOnHands(character),
      paladinChannelDivinity: vaultPaladinChannelDivinity(character),
      paladinFreeCasts: vaultPaladinFreeCasts(character),
      sorceryPoints: vaultSorceryPoints(character),
      innateSorcery: vaultInnateSorcery(character),
      sorcerousRestoration: vaultSorcerousRestoration(character),
      metamagic: vaultMetamagic(character),
      freeCastSpells: vaultFreeCastSpells(character),
      invocations: vaultInvocations(character),
      featureOptions: vaultFeatureOptions(character),
      bonusCantrips: vaultBonusCantrips(allEffects),
      spellListClasses: vaultSpellListAccess(allEffects),
      grantedSpells: vaultGrantedSpells(allEffects),
      // Weapon-filtered attack/damage Effects (Fighting Styles today) are read
      // from the same `allEffects` list every other stat uses, so an Active
      // Feature toggle reaches weapon rolls too.
      // `itemEffectsApply` carries the same licensing question `itemEffects`
      // above already asked, down to the weapon's *own* `+1` — which is read
      // off the row rather than folded into `allEffects` and so had no gate of
      // its own until VAULT-117. A predicate rather than `opts`, because
      // `weaponActions.js` cannot import `itemBenefits.js` without a cycle.
      weaponActions: deriveWeaponActions(
        {
          abilityScores, pb: vaultPb(character), proficiency, armorPenalty,
          itemEffectsApply: item => itemBenefitsApply(item, opts),
        },
        equippedItems,
        allEffects,
      ),
      // Exported so the sheet can explain a withheld bonus — which categories
      // are held, which came from a GM override, and what could not be parsed.
      proficiency,
      // Always present — an Unarmed Strike needs no inventory row. The Monk
      // level and the loadout drive its die; see `unarmedStrike.js`.
      unarmedStrike: deriveUnarmedStrike(
        {
          abilityScores,
          pb: vaultPb(character),
          monkLevel: vaultClassLevel(character, 'Monk'),
          isWearingArmor,
          hasShield,
          armorPenalty,
        },
        equippedItems,
        allEffects,
      ),

      // VAULT-154. The unproficient-armour penalty, stated once for the surfaces
      // that need the *reason* rather than the consequence — the Spell Panel's
      // banner and the GM's override button. The consequences themselves are
      // already on the rolls they touch: the saves and ability checks carry it
      // as `disadvantage`/`disadvantageSources` via `allEffects`, and each
      // attack row carries its own pair.
      //
      // Null when there is nothing to report, so the whole feature is one
      // falsy check at every call site rather than an `active` flag every
      // reader has to remember to test.
      armorPenalty: armorPenalty && {
        ...armorPenalty,
        // The offending pieces, each with the tier a GM override must grant.
        items: unproficientArmorItems,
        // The rule's second half, and the only part that is not a die roll.
        // Named rather than implied, because "you cannot cast spells" is the
        // consequence a player will dispute and the sheet should be able to say
        // which armour caused it.
        blocksSpellcasting: true,
      },

      isWearingArmor,
      hasBarbUD: !isWearingArmor && classes.includes('Barbarian'),
      hasMonkUD: !isWearingArmor && classes.includes('Monk'),
      shieldBonus,
      dexMod,
      conMod,
      wisMod,
    }, character)
  }

  // Not a Vault character, so the row is a D&D Beyond one.
  const payload = getPayload(/** @type {DdbRow} */ (character))
  const abs = abilityBlock(payload)
  const dexMod = getAbilityModifier(getAbilityScore(payload, STAT_IDS.DEX))
  const inventory = getInventory(payload)
  const isWearingArmor = inventory.some(
    i => i?.equipped && (i?.definition?.armorTypeId ?? 0) >= 1 && (i?.definition?.armorTypeId ?? 0) <= 3,
  )
  const shieldBonus = inventory
    .filter(i => i?.equipped && i?.definition?.armorTypeId === 4)
    // The filter above kept only rows with a definition.
    .reduce((sum, i) => sum + (i?.definition?.armorClass ?? 2), 0)
  const hasBarbUD = !isWearingArmor && hasClass(payload, 'Barbarian')
  const hasMonkUD = !isWearingArmor && hasClass(payload, 'Monk')

  const abilityScores = abs.map(a => ({
    key: LABEL_TO_KEY[a.label],
    label: a.label,
    fullName: VAULT_ABILITY_FULL[LABEL_TO_KEY[a.label]],
    score: a.score,
    mod: a.mod,
    rollAbility: ABILITY_SLUGS[a.label],
  }))

  const saves = getSaves(payload).map(s => ({
    ...s,
    key: LABEL_TO_KEY[s.label],
    rollAbility: ABILITY_SLUGS[s.label],
  }))

  const skills = getSkills(payload).map(s => ({
    ...s,
    ability: SKILL_ABILITY[s.slug] ?? 'str',
    rollAbility: s.slug,
  }))

  return {
    name: getName(payload),
    avatarUrl: getAvatarUrl(payload),
    backdropUrl: getBackdropUrl(payload),
    race: getRace(payload),
    classes: formatClasses(payload),
    totalLevel: totalCharacterLevel(payload),

    abilityScores,
    hp: applyHpOverrides({ ...deriveHp(payload), tempHp: getTempHitPoints(payload) }, character),
    ac: deriveAc(payload),
    initiative: getInitiative(payload),
    speed: getSpeed(payload),
    pb: proficiencyBonus(payload),

    saves,
    skills,
    passives: getPassives(payload),
    // VAULT-257. `sense` / `set-base` modifiers, in `vaultSenses`' shape.
    senses: getSenses(payload),
    // VAULT-249. D&D Beyond's `bonus spell-attacks` / `<class>-spell-save-dc`
    // modifiers, in the shape the Vault branch emits, so the spell panel folds
    // a Wand of the War Mage the same way for both kinds of character.
    spellBonusEffects: ddbSpellBonusEffects(payload),
    // DDB characters carry no resolvedEffects, so this is the same plain
    // ability-mod + PB line the panel computed for them before. The item gate
    // still applies: a DDB character can hold a Vault magic item from the
    // campaign's own inventory, and it answers to the same toggle.
    weaponActions: deriveWeaponActions(
      {
        abilityScores, pb: proficiencyBonus(payload),
        itemEffectsApply: item => itemBenefitsApply(item, opts),
      },
      equippedItems,
      [],
    ),
    // Same for the Unarmed Strike: no Effects, but the Monk die still scales,
    // since that comes from the class level rather than from an Effect.
    unarmedStrike: deriveUnarmedStrike(
      {
        abilityScores,
        pb: proficiencyBonus(payload),
        monkLevel: getClasses(payload).find(c => c.name === 'Monk')?.level ?? 0,
        isWearingArmor,
        hasShield: shieldBonus > 0,
      },
      equippedItems,
      [],
    ),

    isWearingArmor,
    hasBarbUD,
    hasMonkUD,
    shieldBonus,
    dexMod,
    conMod: getAbilityModifier(getAbilityScore(payload, STAT_IDS.CON)),
    wisMod: getAbilityModifier(getAbilityScore(payload, STAT_IDS.WIS)),
  }
}
