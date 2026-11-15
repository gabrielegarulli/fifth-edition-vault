// @ts-check
// Subpaths rather than the package root on purpose: this file has to stay
// importable by the E2E seeder under plain Node, and the narrower the import the
// less of the library that pulls in.
import { classProficiencyBaseline, classMulticlassProfs } from './vaultDerive.js'
import {
  normaliseProficiencyList, normaliseWeaponProficiency, normaliseArmorTraining,
} from './effects.js'
import { chosenFeatureOptionIds, isFeatureOption } from './featureOptions.js'
import { originFeatEffects } from './originFeatChoices.js'
import { speciesSpellcastingAbility, speciesSpells } from './speciesChoices.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./effects.js').Amount} Amount */
/** @typedef {import('./effects.js').ProficiencyGrant} ProficiencyGrant */
/** @typedef {import('./speciesChoices.js').DraftRace} DraftRace */
/**
 * A content row (a feat, a species, a class, a class or subclass feature), as
 * far as baking reads it. Rows are the catalog's; their effects are read as
 * effects, as they always were.
 *
 * @typedef {{
 *   id?: string | null,
 *   name?: string | null,
 *   data?: {
 *     effects?: readonly Effect[] | null,
 *     benefits?: readonly { key?: string | null, effects?: readonly Effect[] | null }[] | null,
 *     darkvision?: unknown,
 *     proficiencyUnresolved?: readonly string[] | null,
 *     speciesSpellcasting?: { trait?: string | null } | null,
 *     optionOf?: unknown,
 *   } | null,
 *   choices?: { options?: readonly ({ name?: string | null, effects?: readonly Effect[] | null } | null | undefined)[] | null } | null,
 * }} ContentRow
 */
/**
 * A stored `featureChoices` pick, read for the fields baking asks of it.
 *
 * @typedef {{
 *   type?: string | null,
 *   featId?: string | null,
 *   abilityBonus?: string | null,
 *   invocations?: readonly ({ name?: string | null, effects?: readonly Effect[] | null } | null | undefined)[] | null,
 * }} StoredPick
 */
/** @typedef {{ source?: string | null, sourceFeatureId?: string | null, sourceKind?: string, benefitKey?: string }} Envelope */
/**
 * @typedef {{
 *   authored: boolean,
 *   weapons: ProficiencyGrant[],
 *   armor: { category: string }[],
 *   unresolved: { weapons: string[], armor: string[] },
 * }} ClassGrants
 */

/**
 * The stored picks, each read as a `StoredPick`.
 *
 * @param {Readonly<Record<string, unknown>> | null | undefined} featureChoices
 * @returns {[string, StoredPick | null | undefined][]}
 */
const storedPicks = featureChoices =>
  /** @type {[string, StoredPick | null | undefined][]} */ (Object.entries(featureChoices ?? {}))

// Bakes character.json.resolvedEffects[] per ADR 0012. The CharacterBuilder
// (save time) and the Character Sheet's Re-sync Effects action are the two
// callers — they must produce identical output for the same character json.
//
// This module is pure: it takes content rows and returns effects, and knows
// nothing about where the rows came from. Fetching them is `bakeEffects.js`,
// which is a separate file for a reason — `supabaseClient.js` reads
// `import.meta.env`, which does not exist outside Vite, so anything importing
// it transitively cannot run under plain Node. The E2E character seeder
// (e2e/vault/seedCharacter.js) reads the same rows over PostgREST and calls
// `flattenResolvedEffects` directly, which is only possible while this file
// stays free of the client.

// Every effect a feat row carries, from **both** places one can live (VAULT-83).
//
// `data.effects[]` is the flat array authored before benefits existed;
// `data.benefits[].effects[]` is the per-benefit array the split introduced.
// Both are read, and they are not a migration step apart — a feat can carry one,
// the other, or both, because the benefits are generated from prose while the
// seven live flat-array rows are hand-authored content on their own schedule.
//
// The difference that matters downstream is `benefitKey`: an effect from a
// benefit is addressed `feat:<id>:<key>` by `effectKey()`, so two benefits of one
// feat toggle independently and two copies of a repeatable feat do not collide.
// An effect from the flat array deliberately gets **no** benefitKey, so it keeps
// falling back to the bare feature id — which is exactly the key
// `vault_state.activeFeatures` already holds for it.
/**
 * @param {ContentRow} feat
 * @returns {{ effect: Effect, benefitKey: string | null }[]}
 */
function featEffectEntries(feat) {
  /** @type {{ effect: Effect, benefitKey: string | null }[]} */
  const entries = (feat.data?.effects ?? []).map(effect => ({ effect, benefitKey: null }))
  for (const benefit of (feat.data?.benefits ?? [])) {
    for (const effect of (benefit.effects ?? [])) {
      entries.push({ effect, benefitKey: benefit.key ?? null })
    }
  }
  return entries
}

// An ability_score_choice effect resolves to a concrete ability_score_bonus
// using the player's pick, or the single option when there is no real choice.
// Unresolvable choices are dropped.
/**
 * @param {ContentRow} feat
 * @param {string | null | undefined} abilityBonus
 * @returns {Effect[]}
 */
export function featToEffects(feat, abilityBonus) {
  /** @type {Effect[]} */
  const out = []
  for (const { effect: e, benefitKey } of featEffectEntries(feat)) {
    /** @type {Envelope} */
    const envelope = { source: feat.name, sourceFeatureId: feat.id, sourceKind: 'feat' }
    if (benefitKey) envelope.benefitKey = benefitKey

    if (e.type === 'ability_score_choice') {
      const chosenAbility = abilityBonus ?? (e.options?.length === 1 ? e.options[0] : null)
      if (chosenAbility) {
        // `max` rides along because it is the one fact `data.ability` could never
        // hold: an Epic Boon raises an ability to 30, an ordinary feat to 20.
        // Dropping it here would put the cap back out of reach of every consumer.
        out.push({
          type: 'ability_score_bonus',
          ability: chosenAbility,
          amount: e.amount ?? 1,
          ...(e.max == null ? {} : { max: e.max }),
          ...envelope,
        })
      }
    } else {
      out.push({ ...e, ...envelope })
    }
  }
  return out
}

// A class row's starting (or multiclass) proficiencies, in the closed
// vocabulary — VAULT-102.
//
// PHB 2024 grants the full `startingProficiencies` for the class taken **first**
// and a reduced `multiclassProficiencies` for every one after it, and
// `classMulticlassProfs` returns null when a class has no multiclass entry at
// all. Null is *unknown*, not *nothing*: every homebrew class is absent, while
// the Sorcerer and the Wizard genuinely grant no armour and say so with an empty
// list. Collapsing the two is the bug this whole ticket exists to avoid.
//
/**
 * @param {ContentRow | null | undefined} classRow a `content_class` row
 * @param {boolean} isFirst whether this is the character's first class
 * @returns {ClassGrants}
 */
function classProficiencyGrants(classRow, isFirst) {
  /** @type {ClassGrants} */
  const empty = { authored: false, weapons: [], armor: [], unresolved: { weapons: [], armor: [] } }
  if (!classRow) return empty

  if (isFirst) {
    const baseline = classProficiencyBaseline(classRow.data)
    return {
      authored: baseline.authored,
      weapons: baseline.weapons.granted,
      armor: baseline.armor.granted,
      unresolved: { weapons: baseline.weapons.unresolved, armor: baseline.armor.unresolved },
    }
  }

  const mc = classMulticlassProfs(classRow.data)
  if (!mc) return empty
  const weapons = normaliseProficiencyList(mc.weapons, normaliseWeaponProficiency)
  const armor = normaliseProficiencyList(mc.armor, normaliseArmorTraining)
  return {
    authored: true,
    weapons: weapons.granted,
    armor: armor.granted,
    unresolved: { weapons: weapons.unresolved, armor: armor.unresolved },
  }
}

/**
 * The proficiency facts that cannot be said as effects — VAULT-102.
 *
 * The grants themselves go into `resolvedEffects` alongside every feat and
 * subclass grant, because they are the same kind of statement. These two are
 * not statements at all:
 *
 * - **`authored`** is false when any class contributes an unimported or absent
 *   entry, and it poisons the *whole* union rather than that one class. An
 *   effect list has no way to say "and there is something I do not know", so
 *   absence of a grant and absence of the data would otherwise be the same
 *   array — which is precisely the collapse `classProficiencyBaseline` was built
 *   to prevent.
 * - **`unresolved`** carries the strings `normaliseProficiencyList` preserved
 *   verbatim, plus any `data.proficiencyUnresolved` a feature row declares (the
 *   Slugger's Creed negation, the Musketeer's Bayonets). `poisonedBy` reads them
 *   so a grant nobody could parse still stops a confident "not proficient".
 *
 * A character json with no `proficiencyBaseline` key reads as unknown
 * everywhere, so nobody loses `+PB` before their sheet has been re-synced.
 *
 * @param {{ classRows?: readonly (ContentRow | null | undefined)[] | null, featureLists?: readonly (readonly ContentRow[])[] | null }} rows
 * @returns {{ authored: boolean, unresolved: { weapons: string[], armor: string[] } }}
 */
export function proficiencyBaseline({ classRows, featureLists }) {
  /** @type {string[]} */
  const unresolvedWeapons = []
  /** @type {string[]} */
  const unresolvedArmor = []
  let authored = (classRows ?? []).length > 0

  ;(classRows ?? []).forEach((classRow, index) => {
    const grants = classProficiencyGrants(classRow, index === 0)
    if (!grants.authored) authored = false
    unresolvedWeapons.push(...grants.unresolved.weapons)
    unresolvedArmor.push(...grants.unresolved.armor)
  })

  // Feature-level prose the closed vocabulary cannot hold. Weapons only: the
  // armour side maps one-to-one onto `item_type` and has never needed this.
  for (const featureList of featureLists ?? []) {
    for (const feature of featureList) {
      unresolvedWeapons.push(...(feature.data?.proficiencyUnresolved ?? []))
    }
  }

  return {
    authored,
    unresolved: {
      weapons: [...new Set(unresolvedWeapons)],
      armor: [...new Set(unresolvedArmor)],
    },
  }
}

/** @param {unknown} s */
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/**
 * The spells a 2024 species grants, as Effects (VAULT-170).
 *
 * Translated here for the same reason the Darkvision below is: this is the one
 * place holding both the `content_race` row and the effect list, and
 * `character.json.race` carries only the player's *answers* — an id, a lineage
 * name, a chosen ability — never the lineage's spell table.
 *
 * Two effects come out of one innate spell, which is what the rules text
 * actually says:
 *
 *   "You always have that spell prepared. You can cast it once without a
 *    spell slot […] when you finish a Long Rest."
 *
 * The first sentence is a `spell_grant` (`mode: 'prepared'`), the second a
 * `feature_resource` — Ruling 2's rule that a free cast is a spell owning a
 * resource. Splitting them is what makes the sheet render both the spell, with
 * its own save DC, and a recharging pip beside it.
 *
 * **`mode: 'free_cast'` is deliberately not used.** `vaultGrantedSpells` skips
 * that mode by design, so a free-cast grant would render nowhere at all; the
 * prepared/resource pair renders on two surfaces that already exist.
 *
 * @param {ContentRow | null | undefined} race the `content_race` row
 * @param {DraftRace | null | undefined} raceChoice `character.json.race` — the player's answers
 * @param {number} totalLevel
 * @returns {Effect[]}
 */
export function speciesSpellEffects(race, raceChoice, totalLevel) {
  const ability = speciesSpellcastingAbility(race, raceChoice)
  const granted = speciesSpells(race, { race: raceChoice, totalLevel })
  if (granted.length === 0) return []

  // "Elven Lineage (Drow)" reads better on the sheet than either half alone,
  // and is what tells two lineages' grants apart in the roll log.
  const trait = race?.data?.speciesSpellcasting?.trait ?? race?.name ?? 'Species'
  const lineage = raceChoice?.subrace ?? null
  const source = lineage ? `${trait} (${lineage})` : trait

  /** @type {Effect[]} */
  const effects = []
  for (const spell of granted) {
    if (!spell?.name) continue
    effects.push({
      type: 'spell_grant',
      mode: spell.cantrip ? 'cantrip' : 'prepared',
      spell: spell.name,
      spellId: /** @type {string | null} */ (spell.id ?? null),
      // Null when the player has not answered yet, which the panel reads as
      // "use whichever class list carries it" rather than as a broken grant.
      ability: ability ?? null,
      source,
      sourceFeatureId: race?.id ?? null,
    })

    // Only the innate half owns a free cast; a known cantrip is at will.
    if (spell.kind !== 'innate' || spell.uses == null) continue
    effects.push({
      type: 'feature_resource',
      key: `species_${slug(lineage ?? race?.name)}_${slug(spell.name)}`,
      name: `${spell.name} (${lineage ?? race?.name})`,
      uses: spell.uses === 'pb' ? { kind: 'proficiency_bonus' } : /** @type {Amount} */ (spell.uses),
      resets: 'long_rest',
      detail: 'Cast without a spell slot',
      source,
      sourceFeatureId: race?.id ?? null,
    })
  }
  return effects
}

/**
 * The effects on a character's chosen Eldritch Invocations — VAULT-161.
 *
 * Invocations were the one kind of pick that granted **nothing mechanical**.
 * They are stored in `featureChoices` as `{ type: 'invocations', invocations: [
 * …full option entries ] }` and rendered as prose by the Features Tab, and
 * nothing here ever looked at them — so Pact of the Blade's "you can use your
 * Charisma modifier for the attack and damage rolls" was a paragraph a player
 * read and then did the arithmetic for by hand.
 *
 * **The live catalog row wins over the stored pick**, and that asymmetry is the
 * point. `InvocationPicker` snapshots the whole option object at save time, so a
 * character who picked an invocation before its effects were authored carries a
 * copy that predates them; reading the stored one would mean the only route to
 * the effect was re-picking in the builder. Reading the catalog is what makes
 * **Re-sync Effects** do what it claims — re-bake from current DB content. The
 * stored copy is the fallback for when the class row did not load at all.
 *
 * The envelope names the *invocation* as the source and the Eldritch Invocations
 * feature as the id, because that is the only id there is — an option inside a
 * `choices` array has none of its own. `benefitKey` is what keeps two invocations
 * on one warlock addressable apart, exactly as two benefits of one feat are.
 *
 * @param {Readonly<Record<string, unknown>> | null} [featureChoices] `character.json.featureChoices`
 * @param {readonly (readonly ContentRow[])[] | null} [featureLists] the fetched class/subclass feature rows
 * @returns {Effect[]}
 */
export function invocationEffects(featureChoices, featureLists) {
  const rows = (featureLists ?? []).flat()
  /** @type {Effect[]} */
  const effects = []

  for (const [featureId, choice] of storedPicks(featureChoices)) {
    if (choice?.type !== 'invocations') continue
    const options = rows.find(f => f?.id === featureId)?.choices?.options ?? []

    for (const pick of choice.invocations ?? []) {
      if (!pick?.name) continue
      const authored = options.find(o => o?.name === pick.name)?.effects ?? pick.effects
      for (const e of authored ?? []) {
        effects.push({
          ...e,
          source: pick.name,
          sourceFeatureId: featureId,
          sourceKind: 'feature',
          benefitKey: slug(pick.name),
        })
      }
    }
  }
  return effects
}

/**
 * @param {{
 *   feats?: readonly ContentRow[] | null,
 *   race?: ContentRow | null,
 *   featureLists?: readonly (readonly ContentRow[])[] | null,
 *   featureChoices?: Readonly<Record<string, unknown>> | null,
 *   classRows?: readonly (ContentRow | null | undefined)[] | null,
 *   originFeat?: { id?: string | null, choices?: unknown } | null,
 *   raceChoice?: unknown,
 *   totalLevel?: number | null,
 * }} sources the content rows and the json's answers
 * @returns {Effect[]}
 */
export function flattenResolvedEffects({ feats, race, featureLists, featureChoices, classRows, originFeat, raceChoice, totalLevel }) {
  /** @type {Effect[]} */
  const effects = []

  // Class proficiencies as effects — VAULT-102. The same translation-at-the-seam
  // the species Darkvision below gets, and for the same reason: this is the one
  // place holding both the content rows and the effect list, and
  // `character.json.classes[]` carries only an id, a name and a level, so no
  // consumer downstream could have found `startingProficiencies` by itself.
  //
  // Going in as effects rather than as a bespoke field is what makes a Fighter's
  // "Martial weapons" and Martial Weapon Training's identical downstream — one
  // vocabulary, one gate, one describer, and the Active Benefits strip explains
  // both without knowing they came from different tables.
  ;(classRows ?? []).forEach((classRow, index) => {
    // A row that failed to load still holds its place in the array — the index
    // is what decides first-class versus multiclass — but it grants nothing and
    // has no name to stamp. `proficiencyBaseline` is where its absence is felt.
    if (!classRow) return
    const grants = classProficiencyGrants(classRow, index === 0)
    const envelope = { source: classRow.name, sourceFeatureId: classRow.id }
    for (const g of grants.weapons) {
      effects.push({ type: 'weapon_proficiency', ...g, ...envelope })
    }
    for (const g of grants.armor) {
      effects.push({ type: 'armor_training', ...g, ...envelope })
    }
  })

  for (const feat of feats ?? []) {
    const choice = storedPicks(featureChoices).map(([, c]) => c)
      .find(c => (c?.type === 'feat' || c?.type === 'boon') && c.featId === feat.id)
    effects.push(...featToEffects(feat, choice?.abilityBonus ?? null))

    // An Origin Feat's creation-time sub-choices — VAULT-167. Separate from
    // `featToEffects` because these resolve against nothing on the feat row:
    // `Magic Initiate`, `Skilled` and `Crafter` carry benefit prose and no
    // `effects[]` at all, so there is no authored effect for a pick to fill in
    // the way `abilityBonus` fills in an `ability_score_choice`.
    //
    // Only the *origin* feat is asked. The same feat taken later as a general
    // feat stores its picks elsewhere and is VAULT-166's; resolving both here
    // would double the grant for a character holding two copies.
    if (originFeat?.id && feat.id === originFeat.id) {
      const envelope = { source: feat.name, sourceFeatureId: feat.id, sourceKind: 'feat' }
      for (const e of originFeatEffects(feat, originFeat.choices)) {
        effects.push({ ...e, ...envelope })
      }
    }
  }

  if ((race?.data?.effects?.length ?? 0) > 0) {
    for (const e of race?.data?.effects ?? []) {
      effects.push({ ...e, source: race?.name, sourceFeatureId: race?.id })
    }
  }

  // Species Darkvision is a plain number on the race row, not an Effect — this
  // is the one place with both the race data and the effect list in hand, so it
  // is translated into the `sense` vocabulary here. That keeps the derivation
  // layer reading a single shape: `character.json.race` carries only an id and
  // a name, so it could never have found this by itself.
  const darkvision = Number(race?.data?.darkvision)
  if (Number.isFinite(darkvision) && darkvision > 0) {
    effects.push({
      type: 'sense',
      sense: 'darkvision',
      range: darkvision,
      source: race?.name,
      sourceFeatureId: race?.id,
    })
  }

  // `character.json.race`, the player's answers, read as the draft writes them.
  effects.push(...speciesSpellEffects(race, /** @type {DraftRace | null | undefined} */ (raceChoice), totalLevel ?? 1))

  // A Feature Option row is one half of an either/or choice, so its effects apply
  // only when it is the half the player picked. Every other feature at or below
  // the character's level is an automatic grant.
  const chosenOptionIds = chosenFeatureOptionIds(featureChoices)

  for (const featureList of featureLists ?? []) {
    for (const feature of featureList) {
      if (isFeatureOption(feature) && !chosenOptionIds.has(feature.id ?? '')) continue
      for (const e of (feature.data?.effects ?? [])) {
        effects.push({ ...e, source: feature.name, sourceFeatureId: feature.id })
      }
    }
  }

  effects.push(...invocationEffects(featureChoices, featureLists))

  return effects
}

// The ids `bakeResolvedEffects` has to fetch for a character json: every feat
// it carries, its species, and the class/subclass feature lists up to each
// class's level. Split out from the fetching so the E2E seeder can ask the same
// question of PostgREST and get the same answer.
/**
 * @param {{
 *   originFeat?: { id?: string | null } | null,
 *   feats?: readonly { id?: string | null }[] | null,
 *   race?: { id?: string | null } | null,
 *   classes?: readonly { id?: string | null, level?: number | null, subclass?: { id?: string | null } | null }[] | null,
 * }} json a character json
 * @returns {{ featIds: string[], raceId: string | null, classLevels: { classId: string, subclassId: string | null, level: number }[] }}
 */
export function effectSourceIds(json) {
  return {
    featIds: /** @type {string[]} */ ([json.originFeat?.id, ...(json.feats ?? []).map(f => f.id)].filter(Boolean)),
    raceId: json.race?.id ?? null,
    classLevels: (json.classes ?? [])
      .flatMap(cls => (cls.id && cls.level ? [{ classId: cls.id, subclassId: cls.subclass?.id ?? null, level: cls.level }] : [])),
  }
}
